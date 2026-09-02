import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type {
  Category,
  FeaturedListing,
  Location,
  LocationType,
  SearchVendorsParams,
  VendorAlbum,
  VendorDetail,
  VendorReview,
  VendorSearchResult,
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
