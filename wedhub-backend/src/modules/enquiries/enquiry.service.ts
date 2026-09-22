import { createHash } from "node:crypto";
import { ConflictError, NotFoundError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import { logger } from "../../config/logger";
import { getEffectivePlan } from "../entitlements/entitlement.service";
import * as leadRepository from "../leads/lead.repository";
import * as messagingService from "../messaging/messaging.service";
import * as notificationService from "../notifications/notification.service";
import * as searchRepository from "../search/search.repository";
import { rankVendors } from "../search/vendor-ranking.service";
import * as usersService from "../users/users.service";
import * as enquiryRepository from "./enquiry.repository";

const DEDUPE_WINDOW_MINUTES = 15;
const MULTI_VENDOR_SELECTION_SIZE = 3;

export interface EnquiryContactInput {
  contactName: string;
  contactEmail: string;
  contactPhone: string | undefined;
  preferredContactMethod: "EMAIL" | "PHONE" | "WHATSAPP" | undefined;
  weddingDate: Date | undefined;
  weddingLocation: string | undefined;
  budget: number | undefined;
  guestCount: number | undefined;
  message: string | undefined;
}

// product.md §21: dedupe on user/vendor/contact-info/wedding-date +
// a recent-submission window. There is no static uniqueness here — the
// "window" is time-relative, so this can't be a DB unique constraint; the
// service checks for a recent Lead with the same key before creating a new
// one (see findRecentLeadByDedupeKey).
function buildDedupeKey(input: {
  userId: string | undefined;
  vendorId: string;
  contactEmail: string;
  contactPhone: string | undefined;
  weddingDate: Date | undefined;
}): string {
  const parts = [
    input.userId ?? "anon",
    input.vendorId,
    input.contactEmail.toLowerCase(),
    input.contactPhone ?? "",
    input.weddingDate?.toISOString() ?? "",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

async function assertNotDuplicate(dedupeKey: string): Promise<void> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000);
  const existing = await enquiryRepository.findRecentLeadByDedupeKey(dedupeKey, since);
  if (existing) {
    throw new ConflictError(
      `A similar enquiry was already submitted in the last ${DEDUPE_WINDOW_MINUTES} minutes. Please wait before submitting again.`,
    );
  }
}

// Item 20: a logged-in customer gets exactly one open enquiry per vendor,
// ever — not the old 15-minute rolling dedupe, which only ever blocked
// accidental double-submits and let the same pair re-enquire indefinitely
// afterward (or the instant any contact detail changed, since the dedupe
// hash is salted with email/phone/weddingDate). A Conversation's
// (coupleUserId, vendorId) uniqueness already models "have we ever
// connected" with no expiry, so it's reused as the source of truth here
// rather than adding a parallel constraint on Lead (which has no direct
// userId to key on). Anonymous enquiries have no coupleUserId to check
// against and keep the existing time-windowed dedupe unchanged.
async function assertNoExistingConversation(userId: string | undefined, vendorId: string): Promise<void> {
  if (!userId) return;
  const existingConversationId = await messagingService.findExistingConversation(userId, vendorId);
  if (existingConversationId) {
    throw new ConflictError("You've already enquired with this vendor — continue the conversation in your inbox instead.", {
      conversationId: existingConversationId,
    });
  }
}

async function assertVendorIsPublic(vendorId: string): Promise<void> {
  const vendor = await enquiryRepository.findVendorStatus(vendorId);
  if (!vendor || vendor.status !== "APPROVED") {
    throw new NotFoundError("Vendor not found");
  }
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// Which vendors, among a Premium-eligible cohort, should have their new
// lead's contact info unlocked immediately at creation time — never
// redacted, no payment flow ever triggered for them. Reuses
// featured_eligibility as the "this vendor is on a plan that includes full
// lead access" signal rather than introducing a near-identical boolean key
// (same reuse decision as the badge/search-ranking features — see plan §3a).
async function resolveAutoUnlockVendorIds(vendorIds: string[]): Promise<Set<string>> {
  const plans = await Promise.all(vendorIds.map(async (vendorId) => [vendorId, await getEffectivePlan(vendorId)] as const));
  return new Set(plans.filter(([, plan]) => plan.features.featured_eligibility).map(([vendorId]) => vendorId));
}

// Deliberately does NOT throw and only applies to MULTI-vendor auto-matching
// (see PLAN-2026-09-22-premium-feature-buildout.md §6b-note — a couple's
// direct, single-vendor enquiry is never filtered by this, regardless of
// that vendor's cap). Every other entitlement gate in this codebase
// (assertVendorFeatureAccess, canVendorUpload) throws a 403 because the
// VENDOR is the one taking the gated action. Here the COUPLE is submitting
// the enquiry — a vendor's monthly_lead_limit is not something the couple
// knows about or can do anything about, so blocking the submission would
// silently fail a real couple's enquiry over a vendor-side plan limit. This
// instead filters the candidate vendor list down to only vendors still under
// their cap; a capped vendor simply stops being routed new leads until their
// cap resets next month, with no error surfaced to anyone.
async function filterVendorsForLeadRouting(vendorIds: string[]): Promise<{
  routableVendorIds: string[];
  autoUnlockVendorIds: Set<string>;
}> {
  if (vendorIds.length === 0) return { routableVendorIds: [], autoUnlockVendorIds: new Set() };

  const since = startOfCurrentMonth();
  const [counts, plans] = await Promise.all([
    leadRepository.countLeadsSinceForVendors(vendorIds, since),
    Promise.all(vendorIds.map(async (vendorId) => [vendorId, await getEffectivePlan(vendorId)] as const)),
  ]);

  const routableVendorIds: string[] = [];
  const autoUnlockVendorIds = new Set<string>();

  for (const [vendorId, plan] of plans) {
    const cap = plan.limits.monthly_lead_limit;
    const receivedThisMonth = counts.get(vendorId) ?? 0;
    if (cap > 0 && receivedThisMonth >= cap) {
      logger.info({ vendorId, cap, receivedThisMonth }, "Vendor at monthly lead cap — enquiry not routed to this vendor");
      continue;
    }
    routableVendorIds.push(vendorId);
    if (plan.features.featured_eligibility) {
      autoUnlockVendorIds.add(vendorId);
    }
  }

  return { routableVendorIds, autoUnlockVendorIds };
}

// Opens (or reuses — upsertConversation is idempotent) an in-app
// conversation per lead so the customer's enquiry becomes a real,
// followable-up thread rather than a one-shot form submission (items
// 3/5/19). Mirrors matching.service.ts's matchOneCategory: only fires for
// logged-in customers (an anonymous Enquiry has no userId to start a
// conversation as) and vendors with a claimed owner account; a messaging
// failure is logged and swallowed, never rolling back the already-committed
// Lead/Enquiry, since this is a side effect of a successful submission, not
// part of what makes the submission itself succeed.
async function startConversationsForEnquiry(
  userId: string | undefined,
  enquiry: { id: string; contactName: string; message: string | null },
  leads: { id: string; vendorId: string }[],
): Promise<void> {
  if (!userId) return;

  const messageBody =
    enquiry.message?.trim() ||
    `Hi, I'm ${enquiry.contactName} and I just sent an enquiry — looking forward to hearing from you!`;

  await Promise.all(
    leads.map(async (lead) => {
      try {
        const conversation = await messagingService.startConversation(userId, {
          vendorId: lead.vendorId,
          leadId: lead.id,
          enquiryId: enquiry.id,
        });
        await messagingService.sendMessage(conversation.id, userId, messageBody);
      } catch (err) {
        logger.error(
          { err, userId, vendorId: lead.vendorId, leadId: lead.id },
          "Failed to open inbox conversation for enquiry (lead/notification still created)",
        );
      }
    }),
  );
}

// Item 18 (write-back half): when a customer fills wedding date/budget/
// guest count into the enquiry form ad hoc — most likely because they
// skipped the profile-setup wizard entirely — persist whatever they typed
// onto their own WeddingProfile, so it's remembered for future enquiries
// and for search filtering, exactly like the wizard would have saved it.
// Only fills in fields that are currently unset: a customer who already
// completed the wizard has deliberately-set values there, and this enquiry
// form's fields are a much rougher, single-vendor-specific signal that
// should never silently overwrite them. Logged-in customers only — there's
// no WeddingProfile to write to for an anonymous submission. Never allowed
// to fail the enquiry itself: this is a side effect of a successful
// submission, the same contract as queueNotificationsAndAnalytics and
// startConversationsForEnquiry above.
async function writeBackToWeddingProfile(
  userId: string | undefined,
  input: { weddingDate: Date | undefined; budget: number | undefined; guestCount: number | undefined },
): Promise<void> {
  if (!userId) return;
  if (input.weddingDate === undefined && input.budget === undefined && input.guestCount === undefined) return;

  try {
    const user = await usersService.getOwnProfile(userId);
    const existing = user.weddingProfile;
    await usersService.upsertOwnWeddingProfile(userId, {
      weddingDate: existing?.weddingDate == null && input.weddingDate ? input.weddingDate.toISOString() : undefined,
      guestCount: existing?.guestCount == null ? input.guestCount : undefined,
      estimatedBudget: existing?.estimatedBudget == null ? input.budget : undefined,
      weddingStyle: undefined,
      partnerName: undefined,
      notes: undefined,
    });
  } catch (err) {
    logger.error({ err, userId }, "Failed to write enquiry answers back to WeddingProfile (enquiry still created)");
  }
}

async function queueNotificationsAndAnalytics(
  enquiryId: string,
  leads: { id: string; vendorId: string }[],
  userId: string | undefined,
  routingMode: string,
): Promise<void> {
  // Notification delivery happens after commit, via a job — Coding Rule 7's
  // transactional-mutation pattern (external effects never happen inside
  // the DB transaction itself). notify() itself never throws, so a
  // notification-system failure can never fail enquiry/lead creation.
  const vendors = await enquiryRepository.findVendorOwnersByIds(leads.map((lead) => lead.vendorId));
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  await Promise.all(
    leads.map((lead) => {
      const vendor = vendorById.get(lead.vendorId);
      if (!vendor?.ownerUserId) {
        return Promise.resolve(); // admin-created, not-yet-claimed vendor — no one to notify yet
      }
      return notificationService.notify({
        userId: vendor.ownerUserId,
        eventType: "NEW_LEAD",
        data: { businessName: vendor.businessName },
        relatedEntityType: "lead",
        relatedEntityId: lead.id,
      });
    }),
  );
  await Promise.all(
    leads.map((lead) =>
      logAnalyticsEvent({ userId, eventType: "lead_created", vendorId: lead.vendorId, metadata: { routingMode, leadId: lead.id } }),
    ),
  );
  // Arch Phase 18 Stage A — "Enquiry completed" (product.md §46), fired
  // exactly once per enquiry submission regardless of how many leads it
  // fanned out to (a multi-vendor enquiry creates up to
  // MULTI_VENDOR_SELECTION_SIZE leads from one enquiry_completed event) —
  // distinct from lead_created above, which fires once per resulting lead.
  await logAnalyticsEvent({
    userId,
    eventType: "enquiry_completed",
    metadata: { enquiryId, routingMode, leadCount: leads.length },
  });
}

export async function createSingleVendorEnquiry(
  userId: string | undefined,
  input: EnquiryContactInput & {
    vendorId: string;
    source?: "WEB" | "TELEGRAM" | "ADMIN" | "FUTURE_WHATSAPP" | undefined;
    categoryId?: string | undefined;
    cityId?: string | undefined;
  },
) {
  await assertVendorIsPublic(input.vendorId);
  await assertNoExistingConversation(userId, input.vendorId);

  const dedupeKey = buildDedupeKey({
    userId,
    vendorId: input.vendorId,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    weddingDate: input.weddingDate,
  });
  await assertNotDuplicate(dedupeKey);

  // No cap filtering here — a couple's direct, single-vendor enquiry always
  // creates a Lead regardless of that vendor's monthly_lead_limit (see the
  // comment on filterVendorsForLeadRouting). Only resolves whether this one
  // vendor is Premium-eligible, for the auto-unlock-contact-info decision.
  const autoUnlockVendorIds = await resolveAutoUnlockVendorIds([input.vendorId]);

  const { enquiry, leads } = await enquiryRepository.createEnquiryWithLeads(
    {
      userId,
      routingMode: "SINGLE_VENDOR",
      source: input.source ?? "WEB",
      categoryId: input.categoryId,
      cityId: input.cityId,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      preferredContactMethod: input.preferredContactMethod,
      weddingDate: input.weddingDate,
      weddingLocation: input.weddingLocation,
      budget: input.budget,
      guestCount: input.guestCount,
      message: input.message,
    },
    [input.vendorId],
    () => dedupeKey,
    autoUnlockVendorIds,
  );

  await queueNotificationsAndAnalytics(enquiry.id, leads, userId, "SINGLE_VENDOR");
  await startConversationsForEnquiry(userId, enquiry, leads);
  await writeBackToWeddingProfile(userId, {
    weddingDate: input.weddingDate,
    budget: input.budget,
    guestCount: input.guestCount,
  });

  return { enquiry, leads };
}

export async function createMultiVendorEnquiry(
  userId: string | undefined,
  input: EnquiryContactInput & { categoryId: string; cityId: string },
) {
  const { rows } = await searchRepository.searchVendors(
    {
      keyword: undefined,
      categoryId: input.categoryId,
      cityId: input.cityId,
      serviceAreaId: undefined,
      priceMin: undefined,
      // Budget is deliberately NOT applied as a hard priceMax filter here —
      // confirmed with the user after finding it excluded 3 of 4 eligible
      // vendors whose startingPrice sat only slightly above budget.
      // product.md §58's own example (a $4,000 budget still surfacing 3
      // vendors) treats budget as a signal, not an exclusion criterion; the
      // enquiry still records the user's real budget for vendors to see.
      priceMax: undefined,
      verified: undefined,
      attributes: undefined,
      maxAvgResponseTimeMs: undefined,
      page: 1,
      limit: 20,
    },
    "recommended",
  );

  if (rows.length === 0) {
    throw new NotFoundError("No suitable vendors were found for this request");
  }

  // Reuses Arch Phase 7's vendor-ranking service rather than building
  // separate selection logic for "select N suitable vendors" — the same
  // reuse Risk 3 in the risks log flags Stage 6 (Telegram) must also honor.
  const selected = rankVendors(rows).slice(0, MULTI_VENDOR_SELECTION_SIZE);
  const vendorIds = selected.map((v) => v.id);

  const dedupeKeys = new Map(
    vendorIds.map((vendorId) => [
      vendorId,
      buildDedupeKey({
        userId,
        vendorId,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        weddingDate: input.weddingDate,
      }),
    ]),
  );

  for (const dedupeKey of dedupeKeys.values()) {
    await assertNotDuplicate(dedupeKey);
  }

  // Vendors at their monthly cap are dropped from this auto-matched fan-out
  // (never for a couple's direct single-vendor enquiry — see
  // filterVendorsForLeadRouting's comment). Not backfilled from the next-best
  // ranked candidate beyond the top MULTI_VENDOR_SELECTION_SIZE — a matched
  // enquiry ending up with fewer than 3 leads because one vendor was capped
  // is an acceptable, minor degradation; re-running selection against a
  // wider candidate pool is out of scope here.
  const { routableVendorIds, autoUnlockVendorIds } = await filterVendorsForLeadRouting(vendorIds);

  if (routableVendorIds.length === 0) {
    throw new NotFoundError("No suitable vendors were found for this request");
  }

  const { enquiry, leads } = await enquiryRepository.createEnquiryWithLeads(
    {
      userId,
      routingMode: "MULTI_VENDOR",
      source: "WEB",
      categoryId: input.categoryId,
      cityId: input.cityId,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      preferredContactMethod: input.preferredContactMethod,
      weddingDate: input.weddingDate,
      weddingLocation: input.weddingLocation,
      budget: input.budget,
      guestCount: input.guestCount,
      message: input.message,
    },
    routableVendorIds,
    (vendorId) => dedupeKeys.get(vendorId) as string,
    autoUnlockVendorIds,
  );

  await queueNotificationsAndAnalytics(enquiry.id, leads, userId, "MULTI_VENDOR");
  await startConversationsForEnquiry(userId, enquiry, leads);

  return { enquiry, leads };
}

export function listMyEnquiries(userId: string, page: number, limit: number) {
  return Promise.all([
    enquiryRepository.listMyEnquiries(userId, page, limit),
    enquiryRepository.countMyEnquiries(userId),
  ]);
}
