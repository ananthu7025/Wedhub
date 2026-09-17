export interface VendorSearchFilters {
  keyword: string | undefined;
  categoryId: string | undefined;
  cityId: string | undefined;
  serviceAreaId: string | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  verified: boolean | undefined;
  attributes: Record<string, string> | undefined;
  // Item 4: coarse reply-speed filter — "replies within 24h" rather than an
  // exact millisecond threshold, since avgResponseTimeMs is an all-time
  // average, not a guarantee. Value is the cutoff in milliseconds.
  maxAvgResponseTimeMs: number | undefined;
  page: number;
  limit: number;
}

export interface VendorSearchRow {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  verificationLevel: string;
  profileCompleteness: number;
  cityId: string | null;
  shortDescription: string | null;
  startingPrice: string | null;
  currency: string | null;
  logoObjectKey: string | null;
  logoBlurDataUrl: string | null;
  createdAt: Date;
  similarity: number;
  categoryMatch: boolean;
  cityMatch: boolean;
  avgResponseTimeMs: number | null;
}
