import type { OfferBadgeType, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

const OFFER_INCLUDE = {
  media: {
    include: {
      media: {
        select: {
          id: true,
          originalObjectKey: true,
          optimizedObjectKey: true,
          thumbnailObjectKey: true,
          blurDataUrl: true,
          moderationStatus: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.OfferInclude;

const PUBLIC_OFFER_INCLUDE = {
  ...OFFER_INCLUDE,
  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      averageRating: true,
      reviewCount: true,
      city: { select: { id: true, name: true, slug: true } },
      profile: {
        select: {
          logoMedia: {
            select: { thumbnailObjectKey: true, optimizedObjectKey: true, originalObjectKey: true, blurDataUrl: true },
          },
        },
      },
    },
  },
} satisfies Prisma.OfferInclude;

export function findOffersByVendor(vendorId: string) {
  return prisma.offer.findMany({
    where: { vendorId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: OFFER_INCLUDE,
  });
}

export function findOfferById(id: string) {
  return prisma.offer.findUnique({ where: { id }, include: OFFER_INCLUDE });
}

interface CreateOfferData {
  vendorId: string;
  categoryId: string;
  title: string;
  description?: string | null | undefined;
  originalPrice: number;
  offerPrice: number;
  currency: string;
  badgeType: OfferBadgeType;
  discountPercent?: number | null | undefined;
  startDate?: Date | null | undefined;
  endDate?: Date | null | undefined;
  isActive: boolean;
  mediaIds?: string[] | undefined;
}

export async function createOffer(data: CreateOfferData) {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.offer.create({
      data: {
        vendorId: data.vendorId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description ?? null,
        originalPrice: data.originalPrice,
        offerPrice: data.offerPrice,
        currency: data.currency,
        badgeType: data.badgeType,
        discountPercent: data.discountPercent ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        isActive: data.isActive,
      },
    });

    if (data.mediaIds && data.mediaIds.length > 0) {
      await tx.offerMedia.createMany({
        data: data.mediaIds.map((mediaId, index) => ({ offerId: offer.id, mediaId, sortOrder: index })),
      });
    }

    return offer;
  });
}

interface UpdateOfferData {
  categoryId?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  originalPrice?: number | undefined;
  offerPrice?: number | undefined;
  currency?: string | undefined;
  badgeType?: OfferBadgeType | undefined;
  discountPercent?: number | null | undefined;
  startDate?: Date | null | undefined;
  endDate?: Date | null | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
  mediaIds?: string[] | undefined;
}

export async function updateOffer(id: string, data: UpdateOfferData) {
  return prisma.$transaction(async (tx) => {
    const fields: Prisma.OfferUpdateInput = omitUndefined({
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      originalPrice: data.originalPrice,
      offerPrice: data.offerPrice,
      currency: data.currency,
      badgeType: data.badgeType,
      discountPercent: data.discountPercent,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });

    const offer = await tx.offer.update({ where: { id }, data: fields });

    if (data.mediaIds !== undefined) {
      await tx.offerMedia.deleteMany({ where: { offerId: id } });
      if (data.mediaIds.length > 0) {
        await tx.offerMedia.createMany({
          data: data.mediaIds.map((mediaId, index) => ({ offerId: id, mediaId, sortOrder: index })),
        });
      }
    }

    return offer;
  });
}

export function deleteOffer(id: string) {
  return prisma.offer.delete({ where: { id } });
}

// Public: only currently-live offers — active, and (if set) within their
// start/end window. Offers with no dates at all are treated as always live.
function buildPublicWhere(filter: {
  categoryId: string | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
}): Prisma.OfferWhereInput {
  const now = new Date();
  return {
    isActive: true,
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
    ...omitUndefined({
      categoryId: filter.categoryId,
      offerPrice:
        filter.priceMin !== undefined || filter.priceMax !== undefined
          ? omitUndefined({ gte: filter.priceMin, lte: filter.priceMax })
          : undefined,
    }),
  };
}

function resolveOrderBy(sort: "newest" | "price_low" | "price_high" | "discount_high"): Prisma.OfferOrderByWithRelationInput[] {
  switch (sort) {
    case "price_low":
      return [{ offerPrice: "asc" }];
    case "price_high":
      return [{ offerPrice: "desc" }];
    case "discount_high":
      return [{ discountPercent: "desc" }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

export function listPublicOffers(filter: {
  categoryId: string | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  sort: "newest" | "price_low" | "price_high" | "discount_high";
  page: number;
  limit: number;
}) {
  return prisma.offer.findMany({
    where: buildPublicWhere(filter),
    include: PUBLIC_OFFER_INCLUDE,
    orderBy: resolveOrderBy(filter.sort),
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countPublicOffers(filter: {
  categoryId: string | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
}) {
  return prisma.offer.count({ where: buildPublicWhere(filter) });
}
