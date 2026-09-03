import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type {
  Category,
  FeaturedCategory,
  FeaturedListing,
  FeaturedMediaItem,
  Location,
  LocationType,
  SearchVendorsParams,
  VendorAlbum,
  VendorDetail,
  VendorReview,
  VendorSearchResult,
  WeddingStory,
} from "./vendors.types";

/**
 * Public, unauthenticated reads for the discovery surface (Frontend Arch
 * Phase 2). Every function here maps 1:1 to a route confirmed by reading
 * wedhub-backend source directly — see lib/api/vendors.types.ts's header
 * comment. skipAuth: true since none of these need a session.
 */

export function searchVendors(params: SearchVendorsParams) {
  const query: Record<string, string | number | boolean | undefined> = {
    keyword: params.keyword,
    categoryId: params.categoryId,
    cityId: params.cityId,
    serviceAreaId: params.serviceAreaId,
    priceMin: params.priceMin,
    priceMax: params.priceMax,
    verified: params.verified,
    sort: params.sort,
    page: params.page,
    limit: params.limit,
  };
  if (params.attr) {
    for (const [attributeId, value] of Object.entries(params.attr)) {
      query[`attr[${attributeId}]`] = value;
    }
  }
  return apiFetch<VendorSearchResult[], PaginationMeta>("/search/vendors", { query, skipAuth: true });
}

export function getVendorBySlug(slug: string) {
  return apiFetch<VendorDetail>(`/vendors/${slug}`, { skipAuth: true });
}

export function getVendorAlbums(slug: string) {
  return apiFetch<VendorAlbum[]>(`/vendors/${slug}/albums`, { skipAuth: true });
}

export function getVendorReviews(vendorId: string, page = 1, limit = 20) {
  return apiFetch<VendorReview[], PaginationMeta>(`/vendors/${vendorId}/reviews`, {
    query: { page, limit },
    skipAuth: true,
  });
}

export function listCategories() {
  return apiFetch<Category[]>("/categories", { skipAuth: true });
}

// Real, admin-curated categories for the public homepage's category
// carousel/bento grid — backed by Category.isFeaturedOnHomepage/imageUrl/
// startingPriceLabel (added 2026-09-03, see frontenddocs/10-risks-and-
// open-questions.md Open Question 21).
export function listFeaturedCategories() {
  return apiFetch<FeaturedCategory[]>("/categories/featured/homepage", { skipAuth: true });
}

// Real, admin-curated wedding stories for the public homepage's "Real
// Wedding Stories" section (Arch Phase 17, added 2026-09-04) — replaces
// the previously-hardcoded REAL_WEDDING_STORIES array.
export function listFeaturedWeddingStories() {
  return apiFetch<WeddingStory[]>("/wedding-stories/featured/homepage", { skipAuth: true });
}

// Real, admin-curated gallery media for the public homepage's "Gallery
// Inspiration" section (Arch Phase 17, added 2026-09-04) — replaces the
// previously-hardcoded GALLERY_ITEMS array.
export function listFeaturedGalleryMedia() {
  return apiFetch<FeaturedMediaItem[]>("/gallery/featured/homepage", { skipAuth: true });
}

export function getCategoryBySlug(slug: string) {
  return apiFetch<Category>(`/categories/${slug}`, { skipAuth: true });
}

export function listLocations(type?: LocationType, parentId?: string) {
  return apiFetch<Location[]>("/locations", { query: { type, parentId }, skipAuth: true });
}

export function listFeaturedListings(placementType: FeaturedListing["placementType"], limit = 8) {
  return apiFetch<FeaturedListing[], PaginationMeta>("/featured-listings", {
    query: { placementType, limit },
    skipAuth: true,
  });
}
