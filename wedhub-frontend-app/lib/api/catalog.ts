import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type {
  BlogPost,
  Category,
  FeaturedCategory,
  FeaturedListing,
  FeaturedMediaItem,
  Location,
  LocationType,
  PopularSearchCard,
  SearchVendorsParams,
  SeoCombination,
  SeoPageData,
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

// Real, admin-curated popular-search cards for the public homepage's
// "Popular Searches" section (Arch Phase 17, added 2026-09-04) — replaces
// the previously-hardcoded POPULAR_SEARCH_CARDS array.
export function listFeaturedPopularSearchCards() {
  return apiFetch<PopularSearchCard[]>("/popular-searches/featured/homepage", { skipAuth: true });
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

// Real, generated Category/City/Category+City SEO landing-page data (Arch
// Phase 17) — backs /vendors/[category], /vendors/[category]/[city], and
// /vendors/city/[city]'s generateMetadata + on-page copy.
export function getSeoPage(categoryId: string | undefined, cityId: string | undefined) {
  return apiFetch<SeoPageData>("/seo/page", { query: { categoryId, cityId }, skipAuth: true });
}

// Every indexable Category/City/Category+City combination — backs
// app/sitemap.ts.
export function listSeoCombinations() {
  return apiFetch<SeoCombination[]>("/seo/combinations", { skipAuth: true });
}

// Real, admin-curated blog posts for the public homepage's "Latest Blogs &
// Advice" section (Arch Phase 17, added 2026-09-04) — replaces the
// previously-hardcoded LATEST_BLOGS array.
export function listFeaturedBlogPosts() {
  return apiFetch<BlogPost[]>("/blog/featured/homepage", { skipAuth: true });
}

// Published blog posts, paginated, most-recent-first — backs /blog and
// app/sitemap.ts (via a full-limit call for slugs).
export function listBlogPosts(params: { page?: number; limit?: number } = {}) {
  return apiFetch<BlogPost[], PaginationMeta>("/blog", {
    query: { page: params.page ?? 1, limit: params.limit ?? 20 },
    skipAuth: true,
  });
}

// Backs /blog/[slug]'s generateMetadata + page body — 404s (via
// ApiRequestError status 404) for a draft/nonexistent slug, same pattern
// as getSeoPage's 404 handling in category/[categorySlug]/page.tsx.
export function getBlogPostBySlug(slug: string) {
  return apiFetch<BlogPost>(`/blog/${slug}`, { skipAuth: true });
}
