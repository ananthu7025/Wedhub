import type { MediaType, SubscriptionPlan } from "@prisma/client";
import { AuthorizationError } from "../../common/errors";
import { logger } from "../../config/logger";
import { GRACE_PERIOD_DAYS } from "../subscriptions/billing-period.util";
import * as planRepository from "../plans/plan.repository";
import * as subscriptionRepository from "../subscriptions/subscription.repository";
import * as entitlementRepository from "./entitlement.repository";
import {
  Entitlement,
  FALLBACK_PLAN_FEATURES,
  FALLBACK_PLAN_LIMITS,
  FEATURE_CATALOG,
  type AnalyticsLevel,
  type BooleanFeatureKey,
  type EntitlementKey,
  type PlanFeatures,
  type PlanLimits,
} from "./entitlement.constants";

export { FALLBACK_PLAN_LIMITS, FALLBACK_PLAN_FEATURES, FEATURE_CATALOG } from "./entitlement.constants";

interface EffectivePlan {
  limits: PlanLimits;
  features: PlanFeatures;
  planId: string;
  planName: string;
}

// Exported so callers that just activated/renewed a specific plan (trial
// start, webhook renewal/activation) can pass that plan's limits straight
// into restoreInactiveMediaToLimits without re-deriving fallback defaults
// themselves — this stays the one place those defaults are declared.
export function readLimits(plan: SubscriptionPlan): PlanLimits {
  const raw = plan.limits as Partial<PlanLimits> | null;
  const result = {} as PlanLimits;
  for (const def of FEATURE_CATALOG) {
    if (def.valueType !== "limit") continue;
    const key = def.key as keyof PlanLimits;
    result[key] = (raw?.[key] as number | undefined) ?? (def.defaultValue as number);
  }
  return result;
}

function readFeatures(plan: SubscriptionPlan): PlanFeatures {
  const raw = plan.features as Partial<Record<BooleanFeatureKey, boolean>> | null;
  const result = { analytics_level: FALLBACK_PLAN_FEATURES.analytics_level } as PlanFeatures;
  for (const def of FEATURE_CATALOG) {
    if (def.valueType !== "boolean" || def.key === Entitlement.ANALYTICS_LEVEL) continue;
    const key = def.key as BooleanFeatureKey;
    result[key] = raw?.[key] ?? (def.defaultValue as boolean);
  }
  // analytics_level is stored/edited as a boolean toggle on the plan's
  // features JSON but exposed as the "basic"|"advanced" string everywhere
  // else in the app — this is the one place that mapping happens.
  const advancedToggle = (plan.features as Record<string, unknown> | null)?.[Entitlement.ANALYTICS_LEVEL];
  result.analytics_level = advancedToggle === true ? "advanced" : "basic";
  return result;
}

function synthesizeFallbackPlan(): SubscriptionPlan {
  return {
    id: "__fallback__",
    name: "Fallback",
    features: FALLBACK_PLAN_FEATURES,
    limits: FALLBACK_PLAN_LIMITS,
  } as unknown as SubscriptionPlan;
}

// Replaces the old hardcoded FREE_EFFECTIVE_PLAN constant. Reads the real DB
// row flagged isDefault — the plan a vendor with no Subscription row gets,
// and where a lapsed/cancelled vendor lands. Falls back to code defaults only
// if, somehow, no plan is currently flagged isDefault (should be unreachable
// given the DB's partial unique index + seed data, but this function must
// never throw for a vendor with no subscription — every other module depends
// on that invariant).
export async function getDefaultPlan(): Promise<SubscriptionPlan> {
  const plan = await planRepository.findDefaultPlan();
  if (plan) return plan;
  logger.error("No plan flagged isDefault — falling back to hardcoded feature-catalog defaults. This should never happen.");
  return synthesizeFallbackPlan();
}

async function effectivePlanFor(plan: SubscriptionPlan): Promise<EffectivePlan> {
  return { limits: readLimits(plan), features: readFeatures(plan), planId: plan.id, planName: plan.name };
}

// The single place "what plan is this vendor really on right now" is decided.
// Scenario A: no Subscription row at all → the current default plan, no DB
// write needed.
// Scenario E: a PAST_DUE subscription whose grace period has elapsed is
// lazily flipped to EXPIRED here (product.md §28E — "after grace period,
// paid entitlements are removed... vendor falls back to the default plan").
// Scenario F: a subscription with cancelAtPeriodEnd=true whose
// currentPeriodEnd has already passed (the vendor kept paid benefits until
// then, as promised) is also lazily expired here.
// Both cases sweep the vendor's media down to the default plan's limits in
// the same pass, rather than running a separate scheduler — confirmed with
// the user, since no cron/repeatable-job infrastructure exists yet in this
// codebase.
export async function getEffectivePlan(vendorId: string): Promise<EffectivePlan> {
  const subscription = await subscriptionRepository.findCurrentSubscription(vendorId);
  if (!subscription) {
    return effectivePlanFor(await getDefaultPlan());
  }

  const now = new Date();
  let expired = false;

  if (subscription.status === "PAST_DUE" && subscription.pastDueSince) {
    const graceDeadline = new Date(subscription.pastDueSince);
    graceDeadline.setDate(graceDeadline.getDate() + GRACE_PERIOD_DAYS);
    if (graceDeadline < now) {
      expired = true;
      logger.info({ vendorId, subscriptionId: subscription.id }, "Grace period elapsed — subscription expired, entitlements fell back to the default plan");
    }
  } else if (subscription.status === "ACTIVE" && subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd < now) {
    expired = true;
    logger.info({ vendorId, subscriptionId: subscription.id }, "Cancel-at-period-end reached — subscription expired, entitlements fell back to the default plan");
  }

  if (expired) {
    await subscriptionRepository.expireSubscription(subscription.id);
    const defaultPlan = await getDefaultPlan();
    await sweepMediaToLimits(vendorId, readLimits(defaultPlan));
    return effectivePlanFor(defaultPlan);
  }

  return effectivePlanFor(subscription.plan);
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

// Generic over every boolean-typed catalog feature — adding a new boolean
// feature to FEATURE_CATALOG never requires touching this signature.
export async function canVendorUse(vendorId: string, key: BooleanFeatureKey): Promise<boolean> {
  const plan = await getEffectivePlan(vendorId);
  return Boolean(plan.features[key]);
}

// Throws (403) rather than returning a boolean — every real call site is a
// "the vendor/admin is trying to do this right now" gate, so an exception
// matches the rest of the codebase's guard-clause style (see
// canVendorUpload below) and can't be silently ignored by a forgetful
// caller. featureLabel is passed by the caller so the 403 message is
// specific without duplicating string literals per call site.
export async function assertVendorFeatureAccess(vendorId: string, key: BooleanFeatureKey, featureLabel: string): Promise<void> {
  const allowed = await canVendorUse(vendorId, key);
  if (!allowed) {
    throw new AuthorizationError(`${featureLabel} is not included in this vendor's current plan. Upgrade the plan to unlock it.`);
  }
}

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
