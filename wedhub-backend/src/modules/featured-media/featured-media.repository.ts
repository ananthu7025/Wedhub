import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

// Category comes from the media's vendor's primary category (real,
// existing VendorCategory link — no separate category field needed on
// this model). Same READY/APPROVED public-visibility gate as
// albums.repository.ts's listPublicVendorAlbums.
const FEATURED_MEDIA_INCLUDE = {
  media: {
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          categories: { where: { isPrimary: true }, include: { category: { select: { id: true, name: true } } } },
        },
      },
    },
  },
} as const;

export function findFeatured() {
  return prisma.featuredMedia.findMany({
    where: { media: { status: "READY", moderationStatus: "APPROVED" } },
    orderBy: { sortOrder: "asc" },
    include: FEATURED_MEDIA_INCLUDE,
  });
}

export function findAllForAdmin() {
  return prisma.featuredMedia.findMany({
    orderBy: { sortOrder: "asc" },
    include: FEATURED_MEDIA_INCLUDE,
  });
}

export function findById(id: string) {
  return prisma.featuredMedia.findUnique({ where: { id }, include: FEATURED_MEDIA_INCLUDE });
}

export function findMediaForFeaturing(mediaId: string) {
  return prisma.media.findUnique({ where: { id: mediaId }, select: { id: true, status: true, moderationStatus: true } });
}

export function createFeaturedMedia(data: { mediaId: string; titleOverride: string | undefined; sortOrder: number | undefined }) {
  const fields = omitUndefined({ titleOverride: data.titleOverride, sortOrder: data.sortOrder });
  return prisma.featuredMedia.create({ data: { mediaId: data.mediaId, ...fields }, include: FEATURED_MEDIA_INCLUDE });
}

export interface FeaturedMediaUpdateFields {
  titleOverride: string | null | undefined;
  sortOrder: number | undefined;
}

export function updateFeaturedMedia(id: string, data: FeaturedMediaUpdateFields) {
  return prisma.featuredMedia.update({ where: { id }, data: omitUndefined(data), include: FEATURED_MEDIA_INCLUDE });
}

export function deleteFeaturedMedia(id: string) {
  return prisma.featuredMedia.delete({ where: { id } });
}
