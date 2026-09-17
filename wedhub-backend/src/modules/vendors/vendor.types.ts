export interface CreateVendorInput {
  businessName: string;
}

export interface UpdateVendorInput {
  businessName: string | undefined;
}

export interface UpsertVendorProfileInput {
  shortDescription: string | null | undefined;
  description: string | null | undefined;
  vendorType: string | null | undefined;
  tags: string[] | undefined;
  address: string | null | undefined;
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
  travelPolicy: string | null | undefined;
  website: string | null | undefined;
  phone: string | null | undefined;
  email: string | null | undefined;
  socialLinks: Record<string, string> | undefined;
  businessHours: Record<string, string> | undefined;
  availabilityNotes: string | undefined;
  seoTitle: string | undefined;
  seoDescription: string | undefined;
  canonicalUrl: string | undefined;
  cityId: string | undefined;
  logoMediaId: string | null | undefined;
  coverMediaId: string | null | undefined;
  willingToTravel: boolean | undefined;
  advanceBookingPercent: number | undefined;
  cancellationPolicy: string | null | undefined;
  eventsCompletedRange: string | undefined;
}

export interface SetCategoriesInput {
  primaryCategoryId: string;
  subcategoryIds: string[];
}

export interface SetServiceAreasInput {
  locationIds: string[];
}

export type NumberRangeValue = { min: number; max: number };
export type TimeValue = { time: string };
export type TimeRangeValue = { start: string; end: string };

export interface AttributeValueInput {
  attributeId: string;
  value: string | number | boolean | string[] | NumberRangeValue | TimeValue | TimeRangeValue;
}

export interface CreatePackageInput {
  name: string;
  description: string | undefined;
  price: number;
  currency: string | undefined;
  inclusions: string[] | undefined;
  imageMediaId: string | null | undefined;
}

export interface UpdatePackageInput {
  name: string | undefined;
  description: string | undefined;
  price: number | undefined;
  currency: string | undefined;
  inclusions: string[] | undefined;
  imageMediaId: string | null | undefined;
  sortOrder: number | undefined;
  isActive: boolean | undefined;
}

export interface CompletenessResult {
  score: number;
  missing: string[];
}
