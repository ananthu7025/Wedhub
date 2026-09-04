import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

// No relation to include — unlike WeddingStory/FeaturedMedia, this model
// is fully standalone (own title/location/price/image/link), so there's
// nothing to gate on a separate entity's visibility/moderation status.
export function findFeatured() {
  return prisma.popularSearchCard.findMany({
    where: { isFeatured: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function findAllForAdmin() {
  return prisma.popularSearchCard.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export function findById(id: string) {
  return prisma.popularSearchCard.findUnique({ where: { id } });
}

export interface PopularSearchCardCreateFields {
  title: string;
  locationBlurb: string;
  priceLabel: string;
  imageUrl: string | null | undefined;
  searchQuery: string;
  isFeatured: boolean | undefined;
  sortOrder: number | undefined;
}

export function createCard(data: PopularSearchCardCreateFields) {
  const fields = omitUndefined({ imageUrl: data.imageUrl, isFeatured: data.isFeatured, sortOrder: data.sortOrder });
  return prisma.popularSearchCard.create({
    data: {
      title: data.title,
      locationBlurb: data.locationBlurb,
      priceLabel: data.priceLabel,
      searchQuery: data.searchQuery,
      ...fields,
    },
  });
}

export interface PopularSearchCardUpdateFields {
  title: string | undefined;
  locationBlurb: string | undefined;
  priceLabel: string | undefined;
  imageUrl: string | null | undefined;
  searchQuery: string | undefined;
  isFeatured: boolean | undefined;
  sortOrder: number | undefined;
}

export function updateCard(id: string, data: PopularSearchCardUpdateFields) {
  return prisma.popularSearchCard.update({ where: { id }, data: omitUndefined(data) });
}

export function deleteCard(id: string) {
  return prisma.popularSearchCard.delete({ where: { id } });
}
