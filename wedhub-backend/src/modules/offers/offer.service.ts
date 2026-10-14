import { NotFoundError, ValidationError } from "../../common/errors";
import { getPublicUrl } from "../../integrations/storage/r2.client";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as categoryRepository from "../categories/categories.repository";
import * as offerRepository from "./offer.repository";
import type { CreateOfferBody, UpdateOfferBody } from "./offer.types";

type VendorOfferWithRelations = Awaited<ReturnType<typeof offerRepository.findOffersByVendor>>[number];
type PublicOfferWithRelations = Awaited<ReturnType<typeof offerRepository.listPublicOffers>>[number];

function mediaUrl(media: { optimizedObjectKey: string | null; originalObjectKey: string } | null | undefined) {
  if (!media) return null;
  return getPublicUrl(media.optimizedObjectKey ?? media.originalObjectKey);
}

// Explicit discountPercent always wins (vendor override); otherwise derive
// from the two prices so the frontend always has a number to show on a
// SAVE_PERCENT/FLAT_PERCENT_OFF badge without doing the math itself.
function resolveDiscountPercent(originalPrice: number, offerPrice: number, explicit: number | null): number {
  if (explicit !== null) return explicit;
  if (originalPrice <= 0) return 0;
  return Math.round((1 - offerPrice / originalPrice) * 100);
}

function formatOffer(offer: VendorOfferWithRelations) {
  const originalPrice = Number(offer.originalPrice);
  const offerPrice = Number(offer.offerPrice);
  return {
    id: offer.id,
    vendorId: offer.vendorId,
    category: offer.category,
    title: offer.title,
    description: offer.description,
    originalPrice,
    offerPrice,
    currency: offer.currency,
    badgeType: offer.badgeType,
    discountPercent: resolveDiscountPercent(originalPrice, offerPrice, offer.discountPercent),
    startDate: offer.startDate,
    endDate: offer.endDate,
    isActive: offer.isActive,
    sortOrder: offer.sortOrder,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    media: offer.media.map((m) => ({
      id: m.id,
      mediaId: m.mediaId,
      sortOrder: m.sortOrder,
      url: mediaUrl(m.media),
      thumbnailUrl: m.media.thumbnailObjectKey ? getPublicUrl(m.media.thumbnailObjectKey) : null,
      blurDataUrl: m.media.blurDataUrl,
    })),
  };
}

function formatPublicOffer(offer: PublicOfferWithRelations) {
  const base = formatOffer(offer);
  const logoMedia = offer.vendor.profile?.logoMedia;
  const logoKey = logoMedia?.thumbnailObjectKey ?? logoMedia?.optimizedObjectKey ?? logoMedia?.originalObjectKey;
  return {
    ...base,
    vendor: {
      id: offer.vendor.id,
      businessName: offer.vendor.businessName,
      slug: offer.vendor.slug,
      averageRating: Number(offer.vendor.averageRating),
      reviewCount: offer.vendor.reviewCount,
      city: offer.vendor.city,
      logoUrl: logoKey ? getPublicUrl(logoKey) : null,
      logoBlurDataUrl: logoMedia?.blurDataUrl ?? null,
    },
  };
}

export async function listMyOffers(userId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const offers = await offerRepository.findOffersByVendor(vendor.id);
  return offers.map(formatOffer);
}

export async function getMyOffer(userId: string, offerId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const offer = await offerRepository.findOfferById(offerId);
  if (!offer || offer.vendorId !== vendor.id) {
    throw new NotFoundError("Offer not found");
  }
  return formatOffer(offer);
}

async function assertCategoryExists(categoryId: string) {
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) {
    throw new ValidationError("Category not found");
  }
}

export async function createOffer(userId: string, input: CreateOfferBody) {
  const vendor = await getOwnedVendorOrThrow(userId);
  await assertCategoryExists(input.categoryId);

  const created = await offerRepository.createOffer({
    vendorId: vendor.id,
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    originalPrice: input.originalPrice,
    offerPrice: input.offerPrice,
    currency: input.currency,
    badgeType: input.badgeType,
    discountPercent: input.discountPercent,
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: input.isActive,
    mediaIds: input.mediaIds,
  });

  const reloaded = await offerRepository.findOfferById(created.id);
  if (!reloaded) throw new NotFoundError("Failed to fetch created offer");
  return formatOffer(reloaded);
}

export async function updateOffer(userId: string, offerId: string, input: UpdateOfferBody) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const existing = await offerRepository.findOfferById(offerId);
  if (!existing || existing.vendorId !== vendor.id) {
    throw new NotFoundError("Offer not found");
  }
  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  await offerRepository.updateOffer(offerId, {
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    originalPrice: input.originalPrice,
    offerPrice: input.offerPrice,
    currency: input.currency,
    badgeType: input.badgeType,
    discountPercent: input.discountPercent,
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    mediaIds: input.mediaIds,
  });

  const reloaded = await offerRepository.findOfferById(offerId);
  if (!reloaded) throw new NotFoundError("Failed to fetch updated offer");
  return formatOffer(reloaded);
}

export async function deleteOffer(userId: string, offerId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const existing = await offerRepository.findOfferById(offerId);
  if (!existing || existing.vendorId !== vendor.id) {
    throw new NotFoundError("Offer not found");
  }
  await offerRepository.deleteOffer(offerId);
  return { success: true };
}

export async function listPublicOffers(filter: {
  categoryId: string | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  sort: "newest" | "price_low" | "price_high" | "discount_high";
  page: number;
  limit: number;
}) {
  const [offers, total] = await Promise.all([
    offerRepository.listPublicOffers(filter),
    offerRepository.countPublicOffers(filter),
  ]);
  return [offers.map(formatPublicOffer), total] as const;
}
