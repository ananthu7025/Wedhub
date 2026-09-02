import type { MediaType, SubscriptionPlan } from "@prisma/client";
import { AuthorizationError } from "../../common/errors";
import { logger } from "../../config/logger";
import { GRACE_PERIOD_DAYS } from "../subscriptions/billing-period.util";
import * as subscriptionRepository from "../subscriptions/subscription.repository";
import * as entitlementRepository from "./entitlement.repository";
import {
  Entitlement,
  FREE_PLAN_DEFAULT_FEATURES,
  FREE_PLAN_DEFAULT_LIMITS,
  type AnalyticsLevel,
  type EntitlementKey,
  type PlanFeatures,
  type PlanLimits,
} from "./entitlement.constants";

export { FREE_PLAN_DEFAULT_LIMITS, FREE_PLAN_DEFAULT_FEATURES } from "./entitlement.constants";

interface EffectivePlan {
  limits: PlanLimits;
  features: PlanFeatures;
  tier: "FREE" | "PRO" | "PREMIUM";
}

// Exported so callers that just activated/renewed a specific plan (trial
// start, webhook renewal/activation) can pass that plan's limits straight
// into restoreInactiveMediaToLimits without re-deriving FREE defaults
// themselves — this stays the one place those defaults are declared.
export function readLimits(plan: SubscriptionPlan): PlanLimits {
  const raw = plan.limits as Partial<PlanLimits> | null;
  return {
    portfolio_limit: raw?.portfolio_limit ?? FREE_PLAN_DEFAULT_LIMITS.portfolio_limit,
    video_limit: raw?.video_limit ?? FREE_PLAN_DEFAULT_LIMITS.video_limit,
  };
}

function readFeatures(plan: SubscriptionPlan): PlanFeatures {
  const raw = plan.features as Partial<PlanFeatures> | null;
  return {
    analytics_level: (raw?.analytics_level as AnalyticsLevel) ?? FREE_PLAN_DEFAULT_FEATURES.analytics_level,
    lead_access: raw?.lead_access ?? FREE_PLAN_DEFAULT_FEATURES.lead_access,
    featured_eligibility: raw?.featured_eligibility ?? FREE_PLAN_DEFAULT_FEATURES.featured_eligibility,
    promotional_placement: raw?.promotional_placement ?? FREE_PLAN_DEFAULT_FEATURES.promotional_placement,
    response_tools: raw?.response_tools ?? FREE_PLAN_DEFAULT_FEATURES.response_tools,
    priority_support: raw?.priority_support ?? FREE_PLAN_DEFAULT_FEATURES.priority_support,
  };
}

const FREE_EFFECTIVE_PLAN: EffectivePlan = {
  limits: FREE_PLAN_DEFAULT_LIMITS,
  features: FREE_PLAN_DEFAULT_FEATURES,
  tier: "FREE",
};

// The single place "what plan is this vendor really on right now" is decided.
// Scenario A: no Subscription row at all → implicit FREE, no DB write needed.
// Scenario E: a PAST_DUE subscription whose grace period has elapsed is lazily
// flipped to EXPIRED here (product.md §28E — "after grace period, paid
// entitlements are removed... vendor falls back to FREE").
// Scenario F: a subscription with cancelAtPeriodEnd=true whose currentPeriodEnd
// has already passed (the vendor kept paid benefits until then, as promised)
// is also lazily expired here.
// Both cases sweep the vendor's media down to FREE limits in the same pass,
// rather than running a separate scheduler — confirmed with the user, since
// no cron/repeatable-job infrastructure exists yet in this codebase.
export async function getEffectivePlan(vendorId: string): Promise<EffectivePlan> {
  const subscription = await subscriptionRepository.findCurrentSubscription(vendorId);
  if (!subscription) {
    return FREE_EFFECTIVE_PLAN;
  }

  const now = new Date();
  let expired = false;

  if (subscription.status === "PAST_DUE" && subscription.pastDueSince) {
    const graceDeadline = new Date(subscription.pastDueSince);
    graceDeadline.setDate(graceDeadline.getDate() + GRACE_PERIOD_DAYS);
    if (graceDeadline < now) {
      expired = true;
      logger.info({ vendorId, subscriptionId: subscription.id }, "Grace period elapsed — subscription expired, entitlements fell back to FREE");
    }
  } else if (subscription.status === "ACTIVE" && subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd < now) {
    expired = true;
    logger.info({ vendorId, subscriptionId: subscription.id }, "Cancel-at-period-end reached — subscription expired, entitlements fell back to FREE");
  }

  if (expired) {
    await subscriptionRepository.expireSubscription(subscription.id);
    await sweepMediaToLimits(vendorId, FREE_EFFECTIVE_PLAN.limits);
    return FREE_EFFECTIVE_PLAN;
  }

  return { limits: readLimits(subscription.plan), features: readFeatures(subscription.plan), tier: subscription.plan.tier };
}

function mediaTypeFor(key: "portfolio_limit" | "video_limit"): MediaType {
  return key === "video_limit" ? "VIDEO" : "PORTFOLIO";
}

// Scenario G: never delete. Marks the oldest active items beyond the new
// limit as INACTIVE (hidden, not gone) — called whenever a vendor's
// effective plan limit goes down (grace-period expiry, cancellation,
// immediate downgrade).
export async function sweepMediaToLimits(vendorId: string, limits: PlanLimits): Promise<void> {
  for (const key of ["portfolio_limit", "video_limit"] as const) {
    const mediaType = mediaTypeFor(key);
    const limit = limits[key];
    const active = await entitlementRepository.listActiveMediaOldestFirst(vendorId, mediaType);
    if (active.length <= limit) continue;
    const excess = active.slice(0, active.length - limit).map((m) => m.id);
    await entitlementRepository.setMediaStatuses(excess, "INACTIVE");
    logger.info({ vendorId, mediaType, hiddenCount: excess.length }, "Media marked inactive — over new plan limit");
  }
}

// The inverse: called on upgrade/renewal, since the vendor has regained (or
// increased) capacity and previously entitlement-hidden items should
// reappear rather than stay stuck hidden forever — confirmed with the user.
// Only touches status=INACTIVE rows (entitlement-hidden), never anything a
// moderator hid or that failed processing.
export async function restoreInactiveMediaToLimits(vendorId: string, limits: PlanLimits): Promise<void> {
  for (const key of ["portfolio_limit", "video_limit"] as const) {
    const mediaType = mediaTypeFor(key);
    const limit = limits[key];
    const activeCount = await entitlementRepository.countActiveMedia(vendorId, mediaType);
    const freeSlots = limit - activeCount;
    if (freeSlots <= 0) continue;
    const inactive = await entitlementRepository.listInactiveMediaOldestFirst(vendorId, mediaType);
    const toRestore = inactive.slice(0, freeSlots).map((m) => m.id);
    await entitlementRepository.setMediaStatuses(toRestore, "READY");
    if (toRestore.length > 0) {
      logger.info({ vendorId, mediaType, restoredCount: toRestore.length }, "Media restored — upgrade increased plan limit");
    }
  }
}

export async function canVendorAccess(vendorId: string, key: Extract<EntitlementKey, "analytics_level">): Promise<AnalyticsLevel> {
  const plan = await getEffectivePlan(vendorId);
  return key === Entitlement.ANALYTICS_LEVEL ? plan.features.analytics_level : "basic";
}

export async function canVendorUse(
  vendorId: string,
  key: Extract<EntitlementKey, "featured_eligibility" | "promotional_placement" | "response_tools" | "priority_support" | "lead_access">,
): Promise<boolean> {
  const plan = await getEffectivePlan(vendorId);
  return Boolean(plan.features[key as keyof PlanFeatures]);
}

// Throws (403) rather than returning a boolean — every call site is a
// "the vendor is trying to do this right now" upload gate, so an exception
// matches the rest of the codebase's guard-clause style (see vendor.policy's
// getOwnedVendorOrThrow) and can't be silently ignored by a forgetful caller.
export async function canVendorUpload(vendorId: string, mediaType: MediaType): Promise<void> {
  if (mediaType !== "PORTFOLIO" && mediaType !== "VIDEO") {
    return; // LOGO/COVER are profile assets, not portfolio capacity — never limited
  }
  const plan = await getEffectivePlan(vendorId);
  const limit = mediaType === "VIDEO" ? plan.limits.video_limit : plan.limits.portfolio_limit;
  const currentCount = await entitlementRepository.countActiveMedia(vendorId, mediaType);
  if (currentCount >= limit) {
    throw new AuthorizationError(
      `Your current plan allows up to ${limit} ${mediaType === "VIDEO" ? "video" : "portfolio"} item(s). Upgrade your plan or remove existing media to add more.`,
    );
  }
}
