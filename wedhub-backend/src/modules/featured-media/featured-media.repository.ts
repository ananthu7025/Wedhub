import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

// Category comes from either the standalone GalleryCategory (INSPIRATION_PHOTO
// rows — no vendor) or, when unset, the media's vendor's primary category
// (real, existing VendorCategory link) — see GalleryInspiration.tsx's
// itemCategory() for the fallback order. Same READY/APPROVED
// public-visibility gate as albums.repository.ts's listPublicVendorAlbums.
const FEATURED_MEDIA_INCLUDE = {
  galleryCategory: { select: { id: true, name: true, slug: true } },
  media: {
    include: {
      vendor: {
        select: {
          id: true,
          slug: true,
          businessName: true,
          categories: { where: { isPrimary: true }, include: { category: { select: { id: true, name: true } } } },
        },
      },
    },
  },
} as const;

// gallerySlug filters to one GalleryCategory (the /gallery page's
// ?category=<slug> param) — must happen here, not by filtering an
// already-paginated page client-side, or a page could come back mostly
// empty for a sparse category.
function featuredWhere(gallerySlug: string | undefined) {
  return {
    media: { status: "READY" as const, moderationStatus: "APPROVED" as const },
    ...(gallerySlug ? { galleryCategory: { slug: gallerySlug } } : {}),
  };
}

export function findFeatured(filter: { page: number; limit: number; gallerySlug?: string | undefined }) {
  return prisma.featuredMedia.findMany({
    where: featuredWhere(filter.gallerySlug),
    orderBy: { sortOrder: "asc" },
    include: FEATURED_MEDIA_INCLUDE,
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countFeatured(filter: { gallerySlug?: string | undefined }) {
  return prisma.featuredMedia.count({ where: featuredWhere(filter.gallerySlug) });
}

// Public reference list for the Gallery Inspiration taxonomy — lets the
// admin CMS populate a category picker without a separate module, and lets
// GalleryInspiration.tsx's "All" view render one section per active
// category even when it currently holds zero photos.
export function findActiveGalleryCategories() {
  return prisma.galleryCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, sortOrder: true, isActive: true },
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

export function createFeaturedMedia(data: {
  mediaId: string;
  galleryCategoryId: string | undefined;
  titleOverride: string | undefined;
  sortOrder: number | undefined;
}) {
  const fields = omitUndefined({
    galleryCategoryId: data.galleryCategoryId,
    titleOverride: data.titleOverride,
    sortOrder: data.sortOrder,
  });
  return prisma.featuredMedia.create({ data: { mediaId: data.mediaId, ...fields }, include: FEATURED_MEDIA_INCLUDE });
}

export interface FeaturedMediaUpdateFields {
  galleryCategoryId: string | null | undefined;
  titleOverride: string | null | undefined;
  sortOrder: number | undefined;
}

export function updateFeaturedMedia(id: string, data: FeaturedMediaUpdateFields) {
  return prisma.featuredMedia.update({ where: { id }, data: omitUndefined(data), include: FEATURED_MEDIA_INCLUDE });
}

export function deleteFeaturedMedia(id: string) {
  return prisma.featuredMedia.delete({ where: { id } });
}
