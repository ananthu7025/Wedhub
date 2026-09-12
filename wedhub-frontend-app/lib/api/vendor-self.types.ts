/**
 * Backend response shapes for the vendor self-service surface
 * (/vendors/me/*, /media/*, /vendors/me/albums) — verified field-by-field
 * against wedhub-backend source during Frontend Arch Phase 5 research and
 * the backend additions it required (logoMediaId/coverMediaId write
 * support, category services listing — see ../docs/11-progress-log.md).
 *
 * Prisma Decimal fields serialize as strings over JSON, not numbers.
 */

export type VendorStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "DEACTIVATED";

export type VerificationLevel = "UNVERIFIED" | "IDENTITY_VERIFIED" | "BUSINESS_VERIFIED" | "PLATFORM_VERIFIED";
export type MediaStatus = "PENDING" | "UPLOADING" | "PROCESSING" | "READY" | "INACTIVE" | "FAILED" | "DELETED";
export type MediaModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
export type MediaType =
  | "LOGO"
  | "COVER"
  | "PORTFOLIO"
  | "VIDEO"
  | "STORE_ITEM_PHOTO"
  | "PACKAGE_PHOTO"
  | "CATEGORY_ATTRIBUTE_PHOTO";

export interface MediaItem {
  id: string;
  vendorId: string | null;
  albumId: string | null;
  mediaType: MediaType;
  originalObjectKey: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  status: MediaStatus;
  moderationStatus: MediaModerationStatus;
  sortOrder: number;
  createdAt: string;
}

// ---- GET /vendors/me/detail, PUT .../categories|service-areas|attributes, POST .../submit ----
export interface VendorProfileSelf {
  vendorId: string;
  shortDescription: string | null;
  description: string | null;
  logoMediaId: string | null;
  coverMediaId: string | null;
  logoMedia: MediaItem | null;
  coverMedia: MediaItem | null;
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
  willingToTravel: boolean | null;
  advanceBookingPercent: number | null;
  cancellationPolicy: string | null;
  eventsCompletedRange: string | null;
}

export type CategoryAttributeDataType =
  | "BOOLEAN"
  | "NUMBER"
  | "TEXT"
  | "SELECT"
  | "MULTI_SELECT"
  | "TEXTAREA"
  | "NUMBER_RANGE"
  | "IMAGE"
  | "PHONE"
  | "URL"
  | "EMAIL"
  | "TIME"
  | "TIME_RANGE";

export interface CategoryAttributeSelf {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  dataType: CategoryAttributeDataType;
  options: string[] | null;
  isFilterable: boolean;
  isComparable: boolean;
  isRequired: boolean;
  placeholder: string | null;
  helpText: string | null;
  uiVariant: string | null;
  aspectRatio: string | null;
  sortOrder: number;
}

export interface CategorySelf {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  hasStoreEnabled?: boolean;
  attributes: CategoryAttributeSelf[];
  children?: CategorySelf[];
}

export interface LocationSelf {
  id: string;
  type: "COUNTRY" | "STATE" | "CITY" | "AREA";
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
}

export interface PackageSelf {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  inclusions: string[];
  imageMediaId: string | null;
  image: MediaItem | null;
  sortOrder: number;
  isActive: boolean;
}

export type AttributeValueJson =
  | { min: number; max: number }
  | { time: string }
  | { start: string; end: string };

export interface VendorAttributeValueSelf {
  vendorId: string;
  attributeId: string;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueOptions: string[];
  valueJson: AttributeValueJson | null;
  attribute: CategoryAttributeSelf;
}

export interface VendorSelf {
  id: string;
  businessName: string;
  slug: string;
  status: VendorStatus;
  verificationLevel: VerificationLevel;
  cityId: string | null;
  profileCompleteness: number;
  averageRating: string;
  reviewCount: number;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;

  profile: VendorProfileSelf | null;
  categories: Array<{ vendorId: string; categoryId: string; isPrimary: boolean; category: CategorySelf }>;
  serviceAreas: Array<{ vendorId: string; locationId: string; location: LocationSelf }>;
  packages: PackageSelf[];
  attributeValues: VendorAttributeValueSelf[];
  city: LocationSelf | null;
  // Resolved Media rows for IMAGE-typed attribute values, keyed by
  // attributeId — valueText only stores a Media id (same EAV shape as every
  // other attribute type), so the backend resolves it here to let the
  // profile editor render an existing image preview without a per-field
  // round trip. See vendor.controller.ts's getMyVendor.
  mediaByAttributeId: Record<string, MediaItem>;
}

// Fixed range labels for "Events Completed" (Trust & Credibility section) —
// mirrors EVENTS_COMPLETED_RANGES in wedhub-backend's vendor.schema.ts.
// Same list for every category (unlike Category Details), so this is a
// hardcoded constant, not an admin-configurable option set.
export const EVENTS_COMPLETED_RANGES = ["Under 50", "50-100", "100-250", "250-500", "500+"] as const;

// ---- PUT /vendors/me/profile ----
export interface UpsertProfileBody {
  shortDescription?: string;
  description?: string;
  vendorType?: string;
  tags?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  startingPrice?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  currency?: string;
  customQuoteAvailable?: boolean;
  yearsExperience?: number;
  teamSize?: number;
  languages?: string[];
  travelPolicy?: string;
  website?: string;
  phone?: string;
  email?: string;
  socialLinks?: Record<string, string>;
  businessHours?: Record<string, string>;
  availabilityNotes?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  cityId?: string;
  logoMediaId?: string | null;
  coverMediaId?: string | null;
  willingToTravel?: boolean;
  advanceBookingPercent?: number;
  cancellationPolicy?: string;
  eventsCompletedRange?: string;
}

export interface SetCategoriesBody {
  primaryCategoryId: string;
  subcategoryIds: string[];
}

export interface SetServiceAreasBody {
  locationIds: string[];
}

export interface SetAttributesBody {
  values: Array<{ attributeId: string; value: string | number | boolean | string[] | AttributeValueJson }>;
}

// ---- POST/PATCH /vendors/me/packages ----
export interface CreatePackageBody {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  inclusions?: string[];
  imageMediaId?: string | null;
}

export interface UpdatePackageBody {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  inclusions?: string[];
  imageMediaId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ---- GET /vendors/me/analytics ----
// Arch Phase 18 Stage B: unified vendor analytics — the full product.md §46
// "Vendor analytics" list (Impressions, Profile views, Enquiries, Leads,
// Response rate, Response time, Conversion) in one response. The
// lead-funnel fields (responseRate/averageResponseTimeMs/conversionRate/
// qualifiedLeads/wonLeads/lostLeads) mirror LeadAnalytics (leads.types.ts)
// but are scoped to this endpoint's own tier-based windowDays rather than
// GET /leads/analytics's separate all-time window — the two endpoints
// intentionally answer different questions (this window vs. lifetime) and
// are not meant to return identical numbers for the same-named fields.
export interface VendorAnalytics {
  level: "basic" | "advanced";
  windowDays: 30 | 90;
  profileViews: number;
  portfolioViews?: number;
  whatsappClicks?: number;
  impressions: number;
  leads: number;
  enquiries: number;
  reviews: number;
  responseRate: number;
  averageResponseTimeMs: number | null;
  conversionRate: number;
  qualifiedLeads: number;
  wonLeads: number;
  lostLeads: number;
  profileViewsByDay?: Array<{ day: string; count: number }>;
}

// ---- Media (POST /media/upload-requests, GET /media/me, PATCH/DELETE /media/:id) ----
export interface CreateUploadRequestBody {
  mediaType: MediaType;
  albumId?: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadRequestResult {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

export interface UpdateMediaBody {
  altText?: string;
  sortOrder?: number;
  albumId?: string | null;
}

// ---- Completeness (computed server-side, exposed only via Vendor.profileCompleteness) ----
export const COMPLETENESS_CHECKS: Array<{ label: string; weight: number; requiredForSubmission: boolean }> = [
  { label: "Business name", weight: 20, requiredForSubmission: true },
  { label: "Short description", weight: 10, requiredForSubmission: false },
  { label: "Full description", weight: 10, requiredForSubmission: true },
  { label: "Primary category", weight: 15, requiredForSubmission: true },
  { label: "Primary city", weight: 10, requiredForSubmission: true },
  { label: "At least one service area", weight: 5, requiredForSubmission: false },
  { label: "Pricing information", weight: 10, requiredForSubmission: false },
  { label: "At least one package", weight: 5, requiredForSubmission: false },
  { label: "A contact method", weight: 10, requiredForSubmission: true },
  { label: "Category attribute values", weight: 5, requiredForSubmission: false },
];
