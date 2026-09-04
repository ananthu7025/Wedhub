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
export type MediaType = "LOGO" | "COVER" | "PORTFOLIO" | "VIDEO" | "STORE_ITEM_PHOTO";

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
}

export interface CategoryAttributeSelf {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  dataType: "BOOLEAN" | "NUMBER" | "TEXT" | "SELECT" | "MULTI_SELECT";
  options: string[] | null;
  isFilterable: boolean;
  isComparable: boolean;
  sortOrder: number;
}

export interface ServiceSelf {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface CategorySelf {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  attributes: CategoryAttributeSelf[];
  services: ServiceSelf[];
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
  sortOrder: number;
  isActive: boolean;
}

export interface VendorAttributeValueSelf {
  vendorId: string;
  attributeId: string;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueOptions: string[];
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
  services: Array<{ vendorId: string; serviceId: string; note: string | null; service: ServiceSelf }>;
  packages: PackageSelf[];
  attributeValues: VendorAttributeValueSelf[];
  city: LocationSelf | null;
}

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
}

export interface SetCategoriesBody {
  primaryCategoryId: string;
  subcategoryIds: string[];
}

export interface SetServiceAreasBody {
  locationIds: string[];
}

export interface SetAttributesBody {
  values: Array<{ attributeId: string; value: string | number | boolean | string[] }>;
}

export interface AttachServiceBody {
  serviceId: string;
  note?: string;
}

// ---- POST/PATCH /vendors/me/packages ----
export interface CreatePackageBody {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  inclusions?: string[];
}

export interface UpdatePackageBody {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  inclusions?: string[];
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
  { label: "Business name", weight: 10, requiredForSubmission: true },
  { label: "Short description", weight: 10, requiredForSubmission: false },
  { label: "Full description", weight: 10, requiredForSubmission: true },
  { label: "Primary category", weight: 15, requiredForSubmission: true },
  { label: "Primary city", weight: 10, requiredForSubmission: true },
  { label: "At least one service area", weight: 5, requiredForSubmission: false },
  { label: "Pricing information", weight: 10, requiredForSubmission: false },
  { label: "At least one package", weight: 5, requiredForSubmission: false },
  { label: "At least one service", weight: 10, requiredForSubmission: true },
  { label: "A contact method", weight: 10, requiredForSubmission: true },
  { label: "Category attribute values", weight: 5, requiredForSubmission: false },
];
