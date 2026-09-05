import type { FeaturedListingStatus, PlacementType, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

const VENDOR_SUMMARY_INCLUDE = {
  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      profile: {
        select: {
          shortDescription: true,
          startingPrice: true,
          currency: true,
          logoMedia: { select: { optimizedObjectKey: true, originalObjectKey: true } },
        },
      },
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  city: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.FeaturedListingInclude;

export function findVendorById(id: string) {
  return prisma.vendor.findUnique({ where: { id }, select: { id: true } });
}

export function findPaymentById(id: string) {
  return prisma.payment.findUnique({ where: { id }, select: { id: true } });
}

export function findFeaturedListingById(id: string) {
  return prisma.featuredListing.findUnique({ where: { id }, include: VENDOR_SUMMARY_INCLUDE });
}

export function createFeaturedListing(data: {
  vendorId: string;
  placementType: PlacementType;
  categoryId: string | undefined;
  cityId: string | undefined;
  priority: number;
  price: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  paymentId: string | undefined;
  createdByUserId: string;
}) {
  const fields = omitUndefined({ categoryId: data.categoryId, cityId: data.cityId, paymentId: data.paymentId });
  return prisma.featuredListing.create({
    data: {
      vendorId: data.vendorId,
      placementType: data.placementType,
      priority: data.priority,
      price: data.price,
      currency: data.currency,
      startDate: data.startDate,
      endDate: data.endDate,
      createdByUserId: data.createdByUserId,
      ...fields,
    },
    include: VENDOR_SUMMARY_INCLUDE,
  });
}

export interface FeaturedListingUpdateFields {
  priority: number | undefined;
  price: number | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  status: FeaturedListingStatus | undefined;
  paymentId: string | undefined;
}

export function updateFeaturedListing(id: string, data: FeaturedListingUpdateFields) {
  return prisma.featuredListing.update({
    where: { id },
    data: omitUndefined(data),
    include: VENDOR_SUMMARY_INCLUDE,
  });
}

export function listFeaturedListingsAdmin(filter: {
  status: FeaturedListingStatus | undefined;
  vendorId: string | undefined;
  page: number;
  limit: number;
}) {
  const where: Prisma.FeaturedListingWhereInput = omitUndefined({ status: filter.status, vendorId: filter.vendorId });
  return prisma.featuredListing.findMany({
    where,
    include: VENDOR_SUMMARY_INCLUDE,
    orderBy: [{ createdAt: "desc" }],
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countFeaturedListingsAdmin(filter: { status: FeaturedListingStatus | undefined; vendorId: string | undefined }) {
  const where: Prisma.FeaturedListingWhereInput = omitUndefined({ status: filter.status, vendorId: filter.vendorId });
  return prisma.featuredListing.count({ where });
}

// Public: only currently-ACTIVE listings whose window genuinely covers now —
// "clearly identifiable, currently active" per product.md §30. Placement
// logic (how search/homepage actually use this) is deferred; this is the
// query surface that future logic will call.
export function listActiveFeaturedListings(filter: {
  placementType: PlacementType | undefined;
  categoryId: string | undefined;
  cityId: string | undefined;
  page: number;
  limit: number;
}) {
  const now = new Date();
  const where: Prisma.FeaturedListingWhereInput = {
    status: "ACTIVE",
    startDate: { lte: now },
    endDate: { gte: now },
    ...omitUndefined({ placementType: filter.placementType, categoryId: filter.categoryId, cityId: filter.cityId }),
  };
  return prisma.featuredListing.findMany({
    where,
    include: VENDOR_SUMMARY_INCLUDE,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countActiveFeaturedListings(filter: { placementType: PlacementType | undefined; categoryId: string | undefined; cityId: string | undefined }) {
  const now = new Date();
  const where: Prisma.FeaturedListingWhereInput = {
    status: "ACTIVE",
    startDate: { lte: now },
    endDate: { gte: now },
    ...omitUndefined({ placementType: filter.placementType, categoryId: filter.categoryId, cityId: filter.cityId }),
  };
  return prisma.featuredListing.count({ where });
}
