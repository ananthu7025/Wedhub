export interface VendorSearchFilters {
  keyword: string | undefined;
  categoryId: string | undefined;
  cityId: string | undefined;
  serviceAreaId: string | undefined;
  priceMin: number | undefined;
  priceMax: number | undefined;
  verified: boolean | undefined;
  attributes: Record<string, string> | undefined;
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
  createdAt: Date;
  similarity: number;
  categoryMatch: boolean;
  cityMatch: boolean;
}
