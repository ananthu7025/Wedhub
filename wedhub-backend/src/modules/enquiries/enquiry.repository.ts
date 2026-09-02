import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export interface CreateEnquiryData {
  userId: string | undefined;
  routingMode: "SINGLE_VENDOR" | "MULTI_VENDOR";
  source: "WEB" | "TELEGRAM" | "ADMIN" | "FUTURE_WHATSAPP";
  categoryId: string | undefined;
  cityId: string | undefined;
  serviceId: string | undefined;
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
) {
  const optionalFields = omitUndefined({
    userId: enquiryData.userId,
    categoryId: enquiryData.categoryId,
    cityId: enquiryData.cityId,
    serviceId: enquiryData.serviceId,
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
          data: { enquiryId: enquiry.id, vendorId, dedupeKey: dedupeKeyFor(vendorId) },
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
