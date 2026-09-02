import { createHash } from "node:crypto";
import { ConflictError, NotFoundError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import * as notificationService from "../notifications/notification.service";
import * as searchRepository from "../search/search.repository";
import { rankVendors } from "../search/vendor-ranking.service";
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
  serviceId: string | undefined;
  budget: number | undefined;
  guestCount: number | undefined;
  message: string | undefined;
}

// product.md §21: dedupe on user/vendor/contact-info/wedding-date/service +
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
  serviceId: string | undefined;
}): string {
  const parts = [
    input.userId ?? "anon",
    input.vendorId,
    input.contactEmail.toLowerCase(),
    input.contactPhone ?? "",
    input.weddingDate?.toISOString() ?? "",
    input.serviceId ?? "",
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

async function assertVendorIsPublic(vendorId: string): Promise<void> {
  const vendor = await enquiryRepository.findVendorStatus(vendorId);
  if (!vendor || vendor.status !== "APPROVED") {
    throw new NotFoundError("Vendor not found");
  }
}

async function queueNotificationsAndAnalytics(
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

  const dedupeKey = buildDedupeKey({
    userId,
    vendorId: input.vendorId,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    weddingDate: input.weddingDate,
    serviceId: input.serviceId,
  });
  await assertNotDuplicate(dedupeKey);

  const { enquiry, leads } = await enquiryRepository.createEnquiryWithLeads(
    {
      userId,
      routingMode: "SINGLE_VENDOR",
      source: input.source ?? "WEB",
      categoryId: input.categoryId,
      cityId: input.cityId,
      serviceId: input.serviceId,
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
  );

  await queueNotificationsAndAnalytics(leads, userId, "SINGLE_VENDOR");

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
        serviceId: input.serviceId,
      }),
    ]),
  );

  for (const dedupeKey of dedupeKeys.values()) {
    await assertNotDuplicate(dedupeKey);
  }

  const { enquiry, leads } = await enquiryRepository.createEnquiryWithLeads(
    {
      userId,
      routingMode: "MULTI_VENDOR",
      source: "WEB",
      categoryId: input.categoryId,
      cityId: input.cityId,
      serviceId: input.serviceId,
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
    vendorIds,
    (vendorId) => dedupeKeys.get(vendorId) as string,
  );

  await queueNotificationsAndAnalytics(leads, userId, "MULTI_VENDOR");

  return { enquiry, leads };
}
