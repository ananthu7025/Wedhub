/**
 * Backend response shapes for search/vendors/categories/locations/reviews/
 * albums/featured-listings — verified field-by-field against
 * wedhub-backend source (search.service.ts, vendor.repository.ts,
 * categories.repository.ts, locations.repository.ts, review.repository.ts,
 * album.repository.ts, featured-listing.repository.ts) during Frontend Arch
 * Phase 2 research, not assumed. See frontenddocs/10-risks-and-open-questions.md
 * Open Questions 7-10 for the gaps this uncovered and how they're handled.
 *
 * Prisma Decimal fields serialize as strings over JSON, not numbers —
 * modeled as `string` here deliberately; convert with Number()/parseFloat
 * before doing arithmetic.
 */

export type VerificationLevel = "UNVERIFIED" | "IDENTITY_VERIFIED" | "BUSINESS_VERIFIED" | "PLATFORM_VERIFIED";
export type LocationType = "COUNTRY" | "STATE" | "CITY" | "AREA";
export type AttributeDataType = "BOOLEAN" | "NUMBER" | "TEXT" | "SELECT" | "MULTI_SELECT";

// ---- GET /search/vendors ----
export interface VendorSearchResult {
  id: string;
  businessName: string;
  slug: string;
  verificationLevel: VerificationLevel;
  shortDescription: string | null;
  startingPrice: string | null;
  currency: string | null;
  logoUrl: string | null;
}

export const SEARCH_SORT_OPTIONS = ["relevance", "price_low", "price_high", "newest", "recommended"] as const;
export type SearchSort = (typeof SEARCH_SORT_OPTIONS)[number];

export interface SearchVendorsParams {
  keyword?: string;
  categoryId?: string;
  cityId?: string;
  serviceAreaId?: string;
  priceMin?: number;
  priceMax?: number;
  verified?: boolean;
  attr?: Record<string, string>;
  sort?: SearchSort;
  page?: number;
  limit?: number;
}

// ---- GET /categories, /categories/:slug ----
export interface CategoryAttribute {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  dataType: AttributeDataType;
  options: string[] | null;
  isFilterable: boolean;
  isComparable: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
  isFeaturedOnHomepage: boolean;
  homepageSortOrder: number;
  startingPriceLabel: string | null;
  attributes: CategoryAttribute[];
  children?: Category[];
}

// ---- GET /categories/featured/homepage ----
// Scalar-only rows (categoriesRepository.findFeaturedCategories() does a
// plain findMany with no `include`) — no attributes/children, unlike the
// main Category shape above.
export type FeaturedCategory = Omit<Category, "attributes" | "children">;

// ---- GET /locations ----
export interface Location {
  id: string;
  type: LocationType;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
}

// ---- GET /vendors/:slug ----
export interface VendorAttributeValue {
  vendorId: string;
  attributeId: string;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueOptions: string[];
  attribute: CategoryAttribute;
}

export interface VendorPackage {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  inclusions: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface VendorProfileMedia {
  id: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  originalObjectKey: string;
}

export interface VendorProfile {
  vendorId: string;
  shortDescription: string | null;
  description: string | null;
  logoMediaId: string | null;
  coverMediaId: string | null;
  logoMedia: VendorProfileMedia | null;
  coverMedia: VendorProfileMedia | null;
  vendorType: string | null;
  tags: string[];
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  startingPrice: string | null;
  priceRangeMin: string | null;
  priceRangeMax: string | null;
  currency: string;
  customQuoteAvailable: boolean;
  yearsExperience: number | null;
  teamSize: number | null;
  languages: string[];
  travelPolicy: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  socialLinks: Record<string, string> | null;
  businessHours: Record<string, string> | null;
  availabilityNotes: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
}

export interface VendorDetail {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  verificationLevel: VerificationLevel;
  cityId: string | null;
  profileCompleteness: number;
  averageRating: string;
  reviewCount: number;
  createdAt: string;

  profile: VendorProfile | null;
  categories: Array<{ vendorId: string; categoryId: string; isPrimary: boolean; category: Category }>;
  serviceAreas: Array<{ vendorId: string; locationId: string; location: Location }>;
  services: Array<{ vendorId: string; serviceId: string; note: string | null; service: { id: string; name: string; slug: string } }>;
  packages: VendorPackage[];
  attributeValues: VendorAttributeValue[];
  city: Location | null;
}

// ---- GET /vendors/:slug/albums ----
export interface AlbumMedia {
  id: string;
  albumId: string | null;
  mediaType: "IMAGE" | "VIDEO";
  originalObjectKey: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  altText: string | null;
  sortOrder: number;
}

export interface VendorAlbum {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  coverMediaId: string | null;
  visibility: string;
  sortOrder: number;
  media: AlbumMedia[];
}

// ---- GET /wedding-stories/featured/homepage ----
// Backs the public homepage's "Real Wedding Stories" section — real,
// admin-curated stories over a real vendor's public Album, replacing the
// previously-hardcoded REAL_WEDDING_STORIES array (see frontenddocs/
// 10-risks-and-open-questions.md Open Question 21).
export interface WeddingStory {
  id: string;
  albumId: string;
  coupleName: string;
  location: string;
  tag: string;
  snippet: string;
  isFeatured: boolean;
  sortOrder: number;
  album: {
    id: string;
    name: string;
    vendor: { id: string; businessName: string; slug: string };
    coverMedia: VendorProfileMedia;
  };
}

// ---- GET /gallery/featured/homepage ----
// Backs the public homepage's "Gallery Inspiration" section — real,
// admin-curated selections of real vendor portfolio media, replacing the
// previously-hardcoded GALLERY_ITEMS array in GalleryInspiration.tsx.
export interface FeaturedMediaItem {
  id: string;
  mediaId: string;
  titleOverride: string | null;
  sortOrder: number;
  media: VendorProfileMedia & {
    altText: string | null;
    vendor: {
      id: string;
      businessName: string;
      categories: Array<{ isPrimary: boolean; category: { id: string; name: string } }>;
    };
  };
}

// ---- GET /vendors/:vendorId/reviews ----
export interface VendorReviewPhoto {
  id: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  originalObjectKey: string;
}

export interface VendorReview {
  id: string;
  userId: string;
  vendorId: string;
  serviceId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  eventDate: string | null;
  verifiedInteraction: boolean;
  status: string;
  vendorResponse: string | null;
  vendorRespondedAt: string | null;
  createdAt: string;
  photos: VendorReviewPhoto[];
}

// ---- GET /featured-listings ----
export type FeaturedPlacementType = "HOMEPAGE" | "CATEGORY_PAGE" | "CITY_PAGE" | "SEARCH_RESULTS";

export interface FeaturedListing {
  id: string;
  vendorId: string;
  placementType: FeaturedPlacementType;
  categoryId: string | null;
  cityId: string | null;
  priority: number;
  startDate: string;
  endDate: string;
  status: string;
  vendor: { id: string; businessName: string; slug: string };
  category: { id: string; name: string; slug: string } | null;
  city: { id: string; name: string; slug: string } | null;
}

// ---- GET /seo/page ----
export type SeoPageType = "CATEGORY" | "CITY" | "CATEGORY_CITY";

export interface SeoPageData {
  pageType: SeoPageType;
  title: string;
  h1: string;
  description: string;
  canonicalPath: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
  vendorCount: number;
  indexable: boolean;
  category: { id: string; name: string; slug: string } | null;
  city: { id: string; name: string; slug: string } | null;
}

// ---- GET /seo/combinations ----
export interface SeoCombination {
  pageType: SeoPageType;
  canonicalPath: string;
  categorySlug: string | null;
  citySlug: string | null;
}
