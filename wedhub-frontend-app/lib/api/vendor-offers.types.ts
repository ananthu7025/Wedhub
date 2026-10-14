export type OfferBadgeType =
  | "SAVE_PERCENT"
  | "FLAT_PERCENT_OFF"
  | "NEW"
  | "LIMITED_TIME_DEAL"
  | "FREE_ADD_ON"
  | "TOP_RATED"
  | "CATALOG_OFFER";

export interface OfferMediaItem {
  id: string;
  mediaId: string;
  sortOrder: number;
  url: string | null;
  thumbnailUrl: string | null;
  blurDataUrl: string | null;
}

export interface OfferCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface Offer {
  id: string;
  vendorId: string;
  category: OfferCategorySummary;
  title: string;
  description: string | null;
  originalPrice: number;
  offerPrice: number;
  currency: string;
  badgeType: OfferBadgeType;
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  media: OfferMediaItem[];
}

export interface CreateOfferInput {
  categoryId: string;
  title: string;
  description?: string | null;
  originalPrice: number;
  offerPrice: number;
  currency?: string;
  badgeType: OfferBadgeType;
  discountPercent?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  mediaIds?: string[];
}

export type UpdateOfferInput = Partial<CreateOfferInput> & { sortOrder?: number };

export interface OfferVendorSummary {
  id: string;
  businessName: string;
  slug: string;
  averageRating: number;
  reviewCount: number;
  city: { id: string; name: string; slug: string } | null;
  logoUrl: string | null;
  logoBlurDataUrl: string | null;
}

export interface PublicOffer extends Offer {
  vendor: OfferVendorSummary;
}

export type OfferSort = "newest" | "price_low" | "price_high" | "discount_high";

export interface SearchOffersParams {
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: OfferSort;
  page?: number;
  limit?: number;
}
