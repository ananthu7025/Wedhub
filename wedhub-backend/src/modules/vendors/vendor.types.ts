export interface CreateVendorInput {
  businessName: string;
}

export interface UpdateVendorInput {
  businessName: string | undefined;
}

export interface UpsertVendorProfileInput {
  shortDescription: string | undefined;
  description: string | undefined;
  vendorType: string | undefined;
  tags: string[] | undefined;
  address: string | undefined;
  latitude: number | undefined;
  longitude: number | undefined;
  startingPrice: number | undefined;
  priceRangeMin: number | undefined;
  priceRangeMax: number | undefined;
  currency: string | undefined;
  customQuoteAvailable: boolean | undefined;
  yearsExperience: number | undefined;
  teamSize: number | undefined;
  languages: string[] | undefined;
  travelPolicy: string | undefined;
  website: string | undefined;
  phone: string | undefined;
  email: string | undefined;
  socialLinks: Record<string, string> | undefined;
  businessHours: Record<string, string> | undefined;
  availabilityNotes: string | undefined;
  seoTitle: string | undefined;
  seoDescription: string | undefined;
  canonicalUrl: string | undefined;
  cityId: string | undefined;
  logoMediaId: string | null | undefined;
  coverMediaId: string | null | undefined;
}

export interface SetCategoriesInput {
  primaryCategoryId: string;
  subcategoryIds: string[];
}

export interface SetServiceAreasInput {
  locationIds: string[];
}

export interface AttributeValueInput {
  attributeId: string;
  value: string | number | boolean | string[];
}

export interface CreatePackageInput {
  name: string;
  description: string | undefined;
  price: number;
  currency: string | undefined;
  inclusions: string[] | undefined;
}

export interface UpdatePackageInput {
  name: string | undefined;
  description: string | undefined;
  price: number | undefined;
  currency: string | undefined;
  inclusions: string[] | undefined;
  sortOrder: number | undefined;
  isActive: boolean | undefined;
}

export interface CompletenessResult {
  score: number;
  missing: string[];
}
