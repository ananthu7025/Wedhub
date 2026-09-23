import { createHash } from "node:crypto";
import { logger } from "../../config/logger";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import * as notificationService from "../notifications/notification.service";
import * as messagingService from "../messaging/messaging.service";
import * as searchRepository from "../search/search.repository";
import { rankVendors } from "../search/vendor-ranking.service";
import * as enquiryRepository from "../enquiries/enquiry.repository";
import * as locationsRepository from "../locations/locations.repository";
import type { MatchProfileInput, MatchResult } from "./matching.types";

// Mirrors enquiry.service.ts's MULTI_VENDOR_SELECTION_SIZE — same "how many
// vendors is a reasonable fan-out" judgment call, reused rather than
// re-litigated for this new caller.
const MATCH_SELECTION_SIZE = 3;
const DEDUPE_WINDOW_DAYS = 30;

function formatCurrency(amount: number | null): string {
  if (amount === null) return "any";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function composeMessageBody(input: {
  weddingDate: Date | null;
  cityName: string;
  guestCount: number | null;
  categoryName: string;
  budgetMin: number | null;
  budgetMax: number | null;
}): string {
  const dateText = input.weddingDate
    ? input.weddingDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "an upcoming date";
  const guestText = input.guestCount ? ` for ${input.guestCount} guests` : "";
  const budgetText =
    input.budgetMin !== null || input.budgetMax !== null
      ? ` in the ${formatCurrency(input.budgetMin)}–${formatCurrency(input.budgetMax)} range`
      : "";

  return (
    `Hi! We're planning our wedding on ${dateText} in ${input.cityName}${guestText}, ` +
    `and we're exploring ${input.categoryName} vendors${budgetText}. Would love to hear from you!`
  );
}

// One category preference's worth of matching + lead + conversation-message
// creation. Deliberately does NOT apply budget as a hard priceMax filter —
// same reasoning as enquiry.service.ts::createMultiVendorEnquiry (excluding
// vendors whose price sits only slightly above budget drops otherwise-
// eligible matches; budget is surfaced to the vendor as context in the
// message instead, not used to silently exclude them).
async function matchOneCategory(
  input: MatchProfileInput,
  preference: MatchProfileInput["categoryPreferences"][number],
  cityName: string,
): Promise<MatchResult> {
  const { rows } = await searchRepository.searchVendors(
    {
      keyword: undefined,
      categoryId: preference.categoryId,
      cityId: input.cityId,
      serviceAreaId: undefined,
      priceMin: undefined,
      priceMax: undefined,
      catalogPriceMin: undefined,
      catalogPriceMax: undefined,
      verified: undefined,
      attributes: undefined,
      maxAvgResponseTimeMs: undefined,
      page: 1,
      limit: 20,
    },
    "recommended",
  );

  if (rows.length === 0) {
    return { categoryId: preference.categoryId, matchedVendorIds: [] };
  }

  const selected = rankVendors(rows).slice(0, MATCH_SELECTION_SIZE);
  const vendorIds = selected.map((v) => v.id);

  // Dedupe key mirrors enquiry.service.ts's shape (userId|vendorId|contact
  // info|date) but keyed additionally on categoryId and a 30-day window
  // instead of 15 minutes — this fires from a profile *completion/edit*,
  // not a one-off form submit, so the right question is "have we already
  // told this vendor about this couple's interest in this category
  // recently", not "did they just double-click submit".
  const dedupeKeyFor = (vendorId: string) =>
    createHash("sha256")
      .update(
        [input.userId, vendorId, preference.categoryId, input.contactEmail.toLowerCase(), input.weddingDate?.toISOString() ?? ""].join(
          "|",
        ),
      )
      .digest("hex");

  const since = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const freshVendorIds: string[] = [];
  for (const vendorId of vendorIds) {
    const existing = await enquiryRepository.findRecentLeadByDedupeKey(dedupeKeyFor(vendorId), since);
    if (!existing) freshVendorIds.push(vendorId);
  }

  if (freshVendorIds.length === 0) {
    return { categoryId: preference.categoryId, matchedVendorIds: [] };
  }

  const { enquiry, leads } = await enquiryRepository.createEnquiryWithLeads(
    {
      userId: input.userId,
      routingMode: "CATEGORY_REQUEST",
      source: "WEB",
      categoryId: preference.categoryId,
      cityId: input.cityId,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      preferredContactMethod: undefined,
      weddingDate: input.weddingDate ?? undefined,
      weddingLocation: cityName,
      budget: preference.budgetMax ?? preference.budgetMin ?? undefined,
      guestCount: input.guestCount ?? undefined,
      message: undefined,
    },
    freshVendorIds,
    dedupeKeyFor,
  );

  const messageBody = composeMessageBody({
    weddingDate: input.weddingDate,
    cityName,
    guestCount: input.guestCount,
    categoryName: preference.categoryName,
    budgetMin: preference.budgetMin,
    budgetMax: preference.budgetMax,
  });

  const vendorOwners = await enquiryRepository.findVendorOwnersByIds(freshVendorIds);
  const ownerByVendorId = new Map(vendorOwners.map((v) => [v.id, v]));

  await Promise.all(
    leads.map(async (lead) => {
      const vendor = ownerByVendorId.get(lead.vendorId);
      // Admin-created, not-yet-claimed vendor — no owner account to message
      // or notify yet. Still leaves the Lead row for when it's claimed.
      if (!vendor?.ownerUserId) return;

      // notify() and messaging both never throw on their own failures
      // (see their own "never blocks the core action" contracts) — a
      // delivery hiccup on either must not roll back the Lead/Enquiry
      // that already committed above.
      await notificationService.notify({
        userId: vendor.ownerUserId,
        eventType: "NEW_LEAD",
        data: { businessName: vendor.businessName },
        relatedEntityType: "lead",
        relatedEntityId: lead.id,
      });

      try {
        const conversation = await messagingService.startConversation(input.userId, {
          vendorId: lead.vendorId,
          leadId: lead.id,
          enquiryId: enquiry.id,
        });
        await messagingService.sendMessage(conversation.id, input.userId, messageBody);
      } catch (err) {
        logger.error(
          { err, userId: input.userId, vendorId: lead.vendorId, leadId: lead.id },
          "Failed to deliver matched-prospect inbox message (lead/notification still created)",
        );
      }

      await logAnalyticsEvent({
        userId: input.userId,
        eventType: "lead_created",
        vendorId: lead.vendorId,
        metadata: { routingMode: "CATEGORY_REQUEST", leadId: lead.id, source: "profile_setup_match" },
      });
    }),
  );

  return { categoryId: preference.categoryId, matchedVendorIds: freshVendorIds };
}

// Entry point called by users.service.ts's submitProfileSetup — item 8:
// when a couple completes (or meaningfully edits) their profile, find
// vendors matching each selected category + the couple's city + budget,
// and deliver a genuine-looking prospect lead to each: a NEW_LEAD
// notification (existing vendor-facing event type, unchanged) plus an
// inbox message from the couple, auto-composed to read like a real
// enquiry, not a system notice. Never throws — a matching failure must not
// fail the profile-setup submission that triggered it (mirrors notify()'s
// own contract, for the same reason: this is a side effect of a successful
// save, not part of what makes the save itself succeed or fail).
export async function matchProfileToVendors(input: MatchProfileInput): Promise<MatchResult[]> {
  try {
    const city = await locationsRepository.findLocationById(input.cityId);
    const cityName = city?.name ?? "your area";

    const results = await Promise.all(
      input.categoryPreferences.map((preference) => matchOneCategory(input, preference, cityName)),
    );
    return results;
  } catch (err) {
    logger.error({ err, userId: input.userId, weddingProfileId: input.weddingProfileId }, "Profile-to-vendor matching failed");
    return [];
  }
}
