import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export interface CreateEnquiryData {
  userId: string | undefined;
  // CATEGORY_REQUEST added 2026-09-16 for matching.service.ts's
  // auto-matched-prospect enquiries (item 8) — was already a real Prisma
  // enum value (EnquiryRoutingMode) with no code path using it until now.
  routingMode: "SINGLE_VENDOR" | "MULTI_VENDOR" | "CATEGORY_REQUEST";
  source: "WEB" | "TELEGRAM" | "ADMIN" | "FUTURE_WHATSAPP";
  categoryId: string | undefined;
  cityId: string | undefined;
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

export function createEnquiryWithLeads(
  enquiryData: CreateEnquiryData,
  vendorIds: string[],
  dedupeKeyFor: (vendorId: string) => string,
  // Vendors whose new Lead should have contactUnlockedAt set immediately
  // (Premium-eligible — see enquiry.service.ts::resolveAutoUnlockVendorIds).
  // Optional/defaults to none so every other existing caller of this
  // function (none currently pass a 4th arg) is unaffected.
  autoUnlockVendorIds: Set<string> = new Set(),
) {
  const optionalFields = omitUndefined({
    userId: enquiryData.userId,
    categoryId: enquiryData.categoryId,
    cityId: enquiryData.cityId,
    contactPhone: enquiryData.contactPhone,
    preferredContactMethod: enquiryData.preferredContactMethod as
      | Prisma.EnquiryCreateInput["preferredContactMethod"]
      | undefined,
    weddingDate: enquiryData.weddingDate,
    weddingLocation: enquiryData.weddingLocation,
    budget: enquiryData.budget,
    guestCount: enquiryData.guestCount,
    message: enquiryData.message,
  });

  return prisma.$transaction(async (tx) => {
    const enquiry = await tx.enquiry.create({
      data: {
        routingMode: enquiryData.routingMode,
        source: enquiryData.source,
        contactName: enquiryData.contactName,
        contactEmail: enquiryData.contactEmail,
        ...optionalFields,
      },
    });

    const leads = await Promise.all(
      vendorIds.map((vendorId) =>
        tx.lead.create({
          data: {
            enquiryId: enquiry.id,
            vendorId,
            dedupeKey: dedupeKeyFor(vendorId),
            contactUnlockedAt: autoUnlockVendorIds.has(vendorId) ? new Date() : null,
          },
        }),
      ),
    );

    await Promise.all(
      leads.map((lead) =>
        tx.leadStatusHistory.create({
          data: { leadId: lead.id, fromStatus: null, toStatus: "NEW" },
        }),
      ),
    );

    return { enquiry, leads };
  });
}

export function findRecentLeadByDedupeKey(dedupeKey: string, since: Date) {
  return prisma.lead.findFirst({
    where: { dedupeKey, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
}

export function findVendorStatus(vendorId: string) {
  return prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, status: true } });
}

// Notification recipient lookup: a lead's "vendor" is notified via its
// owning User row — an admin-created, not-yet-claimed vendor has no owner
// and is correctly skipped by the caller rather than erroring.
export function findVendorOwnersByIds(vendorIds: string[]) {
  return prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, ownerUserId: true, businessName: true },
  });
}

// Couple-scoped enquiry tracker (Frontend Arch Phase 4) — Enquiry itself has
// no status field by design (see the model comment in schema.prisma), so the
// couple's view of "what happened" is each Enquiry's fanned-out Lead rows,
// each carrying its own independent LeadStatus.
const MY_ENQUIRY_INCLUDE = {
  leads: {
    include: {
      vendor: { select: { id: true, businessName: true, slug: true } },
      // Item 5: lets the couple's enquiry list link straight into the
      // matching inbox thread when Phase 1's enquiry->conversation wiring
      // created one (see enquiry.service.ts::startConversationsForEnquiry).
      // At most one row in practice — a Conversation's (coupleUserId,
      // vendorId) uniqueness means a given lead can only ever be the
      // provenance link for the one conversation between this couple and
      // this vendor.
      conversations: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export function listMyEnquiries(userId: string, page: number, limit: number) {
  return prisma.enquiry.findMany({
    where: { userId },
    include: MY_ENQUIRY_INCLUDE,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export function countMyEnquiries(userId: string) {
  return prisma.enquiry.count({ where: { userId } });
}
