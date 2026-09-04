import type {
  CategorySelf,
  LocationSelf,
  PackageSelf,
  ServiceSelf,
  VendorAttributeValueSelf,
  VendorProfileSelf,
  VendorStatus,
  VerificationLevel,
} from "./vendor-self.types";
import type { AttributeDataType, LocationType, VendorReviewPhoto } from "./vendors.types";
import type { LeadEnquiry, LeadNote, LeadStatusHistoryEntry, VendorLeadDetail } from "./leads.types";
import type { LeadStatus, ReviewStatus } from "./account.types";

/**
 * Backend response shapes for the admin platform surface (Frontend Arch
 * Phase 8 — Admin Core) — verified against wedhub-backend/src/modules/
 * {admin-dashboard,vendor-admin,admin-users,admin-audit-logs} during
 * research, then re-confirmed field-by-field via live curl.
 *
 * Prisma Decimal fields serialize as strings over JSON EXCEPT where a
 * module explicitly Number()-converts server-side (confirmed: dashboard's
 * revenue/mrr are real numbers, not strings — verified live, this
 * codebase has had Decimal-as-string bugs elsewhere so don't assume).
 */

// ---- GET /admin/dashboard ----
export interface AdminDashboardMetrics {
  totalUsers: number;
  newRegistrations: { count: number; windowDays: number };
  totalVendors: number;
  newVendors: { count: number; windowDays: number };
  activeVendors: number;
  paidVendors: number; // ACTIVE or TRIALING subscriptions count as "paid" here
  totalLeads: number;
  totalEnquiries: number;
  conversionRate: number; // fraction 0-1, not a percentage
  revenue: { total: number; thisMonth: number };
  mrr: number; // ACTIVE only (not TRIALING), YEARLY normalized /12
  arr: number; // mrr * 12
  searchDemand: {
    count: number;
    windowDays: number;
    topKeywords: { keyword: string; count: number }[];
  };
  churnRate: number; // fraction 0-1: cancelled-in-window / active-at-window-start
}

// ---- GET /admin/vendors, GET /admin/vendors/:id ----
// A standalone type (not extending VendorSelf, the self-service /vendors/me
// shape from Phase 5) since the admin scalar field set genuinely differs —
// confirmed via the real Vendor Prisma model: admin responses include
// ownerUserId, creationSource, suspensionReason, approvedAt, deletedAt,
// none of which VendorSelf carries.
export type VendorCreationSource = "SELF_REGISTERED" | "ADMIN_CREATED";

export interface AdminVendor {
  id: string;
  ownerUserId: string | null;
  businessName: string;
  slug: string;
  status: VendorStatus;
  creationSource: VendorCreationSource;
  verificationLevel: VerificationLevel;
  cityId: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  approvedAt: string | null;
  submittedAt: string | null;
  profileCompleteness: number;
  averageRating: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  profile: VendorProfileSelf | null;
  categories: Array<{ vendorId: string; categoryId: string; isPrimary: boolean; category: CategorySelf }>;
  serviceAreas: Array<{ vendorId: string; locationId: string; location: LocationSelf }>;
  services: Array<{ vendorId: string; serviceId: string; note: string | null; service: ServiceSelf }>;
  packages: PackageSelf[];
  attributeValues: VendorAttributeValueSelf[];
  city: LocationSelf | null;
}

export type AdminVendorListItem = AdminVendor;

export interface AdminVendorDetail extends AdminVendor {
  owner: { id: string; email: string; phone: string | null } | null;
}

// POST /admin/vendors returns the raw created Vendor row with NO relations
// included at all (confirmed via live curl — createVendor() in
// vendor-admin.service.ts does a plain prisma.vendor.create() with no
// `include`) — a narrower type than AdminVendorDetail/AdminVendorListItem,
// which both assume the full relation set.
export type AdminVendorScalarOnly = Omit<
  AdminVendor,
  "profile" | "categories" | "serviceAreas" | "services" | "packages" | "attributeValues" | "city"
>;

export interface AdminVendorStatusHistoryEntry {
  id: string;
  vendorId: string;
  fromStatus: VendorStatus | null;
  toStatus: VendorStatus;
  reason: string | null;
  changedByUserId: string | null;
  createdAt: string;
}

// ---- POST /admin/vendors ----
export interface AdminCreateVendorBody {
  businessName: string;
}

// ---- POST /admin/vendors/:id/invitations ----
export interface AdminCreateInvitationBody {
  invitedEmail?: string;
}

export interface AdminVendorInvitation {
  id: string;
  vendorId: string;
  expiresAt: string;
}

// ---- POST /admin/vendors/:id/verify ----
export interface AdminSetVerificationBody {
  verificationLevel: VerificationLevel;
}

// ---- POST /admin/vendors/:id/reject, /suspend ----
export interface AdminReasonBody {
  reason: string;
}

// ---- PATCH /admin/vendors/:id ----
export interface AdminUpdateVendorBody {
  businessName?: string;
  slug?: string;
  cityId?: string;
}

// ---- GET /admin/users, GET /admin/users/:id ----
export type UserRole = "END_USER" | "VENDOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface AdminUserListItem {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  profile: { firstName: string | null; lastName: string | null } | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  vendor: { id: string; businessName: string; slug: string; status: VendorStatus } | null;
}

export interface AdminSuspendUserResult {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  updatedAt: string;
}

// ---- GET /admin/audit-logs ----
export interface AdminAuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string; role: UserRole } | null;
}

/**
 * Frontend Arch Phase 9 — Admin Catalog & Moderation. Verified against
 * wedhub-backend/src/modules/{categories,locations,leads,reviews} during
 * research, then re-confirmed field-by-field via live curl (including a
 * real disable→includeInactive-visible→re-enable round trip for both
 * categories and locations, and a real report→FLAGGED→re-approve cycle
 * for reviews).
 *
 * Categories/locations read types (Category, Location, CategoryAttribute,
 * LocationType, AttributeDataType) are intentionally NOT redefined here —
 * they're imported from vendors.types.ts, since GET /categories and
 * GET /locations are the exact same public endpoints Phase 2 already
 * built against (confirmed no separate /admin/categories or
 * /admin/locations route exists at all — admin-only behavior is gated
 * per-route on the shared categoriesRouter/locationsRouter, with a new
 * ?includeInactive=true param honored only for an authenticated ADMIN).
 */

// ---- POST /categories (ADMIN) ----
export interface AdminCreateCategoryBody {
  name: string;
  description?: string;
  parentId?: string;
}

// ---- PATCH /categories/:id (ADMIN) ----
export interface AdminUpdateCategoryBody {
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  // Homepage presentation fields (added 2026-09-03) — nullable so an admin
  // can explicitly clear a previously-set image/price, not just leave it
  // unchanged.
  imageUrl?: string | null;
  isFeaturedOnHomepage?: boolean;
  homepageSortOrder?: number;
  startingPriceLabel?: string | null;
}

// ---- POST /categories/:id/attributes (ADMIN) ----
export interface AdminCreateAttributeBody {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options?: string[];
  isFilterable?: boolean;
  isComparable?: boolean;
}

// ---- PATCH /categories/:id/attributes/:attributeId (ADMIN) ----
export interface AdminUpdateAttributeBody {
  label?: string;
  options?: string[];
  isFilterable?: boolean;
  isComparable?: boolean;
  sortOrder?: number;
}

// ---- POST /locations (ADMIN) ----
export interface AdminCreateLocationBody {
  type: LocationType;
  name: string;
  parentId?: string;
}

// ---- PATCH /locations/:id (ADMIN) ----
export interface AdminUpdateLocationBody {
  name?: string;
  isActive?: boolean;
}

// ---- GET /admin/leads ----
// The admin list uniquely includes a vendor summary the vendor-scoped
// /leads list doesn't need; the admin DETAIL response omits it (confirmed
// via live curl — GET /admin/leads/:id has no `vendor` key at all), so it
// reuses VendorLeadDetail directly rather than a new type.
export interface AdminLeadListItem {
  id: string;
  enquiryId: string;
  vendorId: string;
  status: LeadStatus;
  contactedAt: string | null;
  respondedAt: string | null;
  isSpam: boolean;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
  enquiry: LeadEnquiry;
  vendor: { id: string; businessName: string; slug: string };
}

export type AdminLeadDetail = VendorLeadDetail;

// ---- PATCH /admin/leads/:id/status ----
// Same body shape as the vendor-facing endpoint, but the admin path
// bypasses the terminal-status lock server-side (confirmed:
// updateStatusAdmin never calls assertNotLeavingTerminalStatus) — the
// admin UI may therefore offer every status transition unconditionally,
// unlike the vendor leads board's terminal-status-disables-the-control
// behavior (Frontend Arch Phase 6).
export interface AdminUpdateLeadStatusBody {
  status: LeadStatus;
  reason?: string;
}

// Response is a scalar-only Lead row (prisma.lead.update() with no
// `include`, confirmed via source read of lead.repository.ts's
// updateLeadStatus) — no enquiry/notes/statusHistory, unlike
// AdminLeadDetail's GET shape.
export interface AdminLeadStatusUpdateResult {
  id: string;
  enquiryId: string;
  vendorId: string;
  status: LeadStatus;
  contactedAt: string | null;
  respondedAt: string | null;
  isSpam: boolean;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
}

export type { LeadNote, LeadStatusHistoryEntry };

// ---- GET /admin/reviews, GET /admin/reviews/:id ----
export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
  reporter: { id: string; email: string; profile: { firstName: string | null; lastName: string | null } | null } | null;
}

interface AdminReviewBase {
  id: string;
  userId: string;
  vendorId: string;
  serviceId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  eventDate: string | null;
  verifiedInteraction: boolean;
  status: ReviewStatus;
  vendorResponse: string | null;
  vendorRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  photos: VendorReviewPhoto[];
  reports: ReviewReport[];
  user: { id: string; email: string; profile: { firstName: string | null; lastName: string | null } | null } | null;
}

// List uniquely includes `vendor`; detail does not (confirmed via live
// curl, same asymmetry as leads) — two distinct types rather than one.
export interface AdminReviewListItem extends AdminReviewBase {
  vendor: { id: string; businessName: string; slug: string };
}

export type AdminReviewDetail = AdminReviewBase;

// ---- PATCH /admin/reviews/:id/status ----
// Only 4 real moderation targets — PENDING is the creation default, never
// a valid PATCH target (confirmed: moderateReviewSchema's enum excludes
// it). "Remove"/"Remove permanently" from the mockup have no distinct
// backend action; HIDDEN is the real equivalent (soft-hide, not a delete
// — the row persists).
export type ReviewModerationStatus = "APPROVED" | "REJECTED" | "FLAGGED" | "HIDDEN";

export interface AdminModerateReviewBody {
  status: ReviewModerationStatus;
}

// Response is a scalar-only Review row (setReviewStatus() is a plain
// prisma.review.update() with no `include`) — no photos/reports/user/
// vendor, unlike AdminReviewDetail's GET shape.
export interface AdminReviewStatusUpdateResult {
  id: string;
  userId: string;
  vendorId: string;
  serviceId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  eventDate: string | null;
  verifiedInteraction: boolean;
  status: ReviewStatus;
  vendorResponse: string | null;
  vendorRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Frontend Arch Phase 10 — Admin Monetization, Governance & Audit.
 * Verified against wedhub-backend/src/modules/{plans,subscriptions,
 * admin-roles,admin-audit-logs} during research, then re-confirmed via
 * live curl (a real Plans create -> deactivate -> public-list-exclusion
 * round trip, and real GET /admin/roles, /admin/permissions,
 * /admin/admin-users, /admin/audit-logs?entityType= calls).
 *
 * Confirmed backend gaps (per user decision, 2026-09-02 — see
 * frontenddocs/10-risks-and-open-questions.md for the full entries):
 * - No GET /admin/subscriptions list endpoint exists at all — only
 *   POST /admin/subscriptions/refunds and POST .../coupons. The Active
 *   Subscriptions and Transactions/Payments admin screens therefore have
 *   NO live list data source (Payment/Invoice models exist but nothing
 *   exposes them) and render an explicit unavailable-state instead of a
 *   table.
 * - WebhookEvent rows are persisted by the real webhook handler but no
 *   admin GET endpoint exists to list them — same unavailable-state
 *   treatment.
 * - Coupons has a real POST (create) but no GET/PATCH/DELETE — the
 *   Coupons screen wires a real create form but shows the same
 *   unavailable-state panel where a list would go.
 * - Settings (feature flags, notification/lead/subscription rules) has
 *   zero backend representation of any kind — built as a fully static
 *   placeholder page, no working controls.
 */

// ---- GET /plans (public), GET /admin/plans, POST/PATCH /admin/plans ----
export type PlanTier = "FREE" | "PRO" | "PREMIUM";
export type BillingInterval = "MONTHLY" | "YEARLY";

export interface AdminPlanFeatures {
  analytics_level?: "basic" | "advanced";
  lead_access?: boolean;
  featured_eligibility?: boolean;
  promotional_placement?: boolean;
  response_tools?: boolean;
  priority_support?: boolean;
}

export interface AdminPlanLimits {
  portfolio_limit?: number;
  video_limit?: number;
}

export interface AdminPlan {
  id: string;
  tier: PlanTier;
  billingInterval: BillingInterval;
  name: string;
  price: string;
  currency: string;
  trialDays: number;
  features: AdminPlanFeatures;
  limits: AdminPlanLimits;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// tier/billingInterval/currency are only settable at creation — confirmed
// via updatePlanSchema, which omits all three.
export interface AdminCreatePlanBody {
  tier: PlanTier;
  billingInterval: BillingInterval;
  name: string;
  price: number;
  currency?: string;
  trialDays?: number;
  features?: AdminPlanFeatures;
  limits?: AdminPlanLimits;
}

export interface AdminUpdatePlanBody {
  name?: string;
  price?: number;
  trialDays?: number;
  features?: AdminPlanFeatures;
  limits?: AdminPlanLimits;
  isActive?: boolean;
}

// ---- POST /admin/subscriptions/coupons ----
// The only coupon endpoint that exists — no list/update/delete (confirmed).
export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface AdminCreateCouponBody {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  maxRedemptions: number | null;
  timesRedeemed: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

// ---- POST /admin/subscriptions/refunds ----
export interface AdminRefundBody {
  razorpayPaymentId: string;
  amountInSmallestUnit?: number;
  reason?: string;
}

// ---- GET /admin/roles, GET /admin/permissions, GET /admin/admin-users ----
// Read-only visibility only (confirmed via the backend repository's own
// comment) — authorize() gates every admin route on the coarse
// User.role='ADMIN' enum; nothing consults these tables for real
// access-control decisions. No POST/PATCH/DELETE exists for any of
// Role/Permission/RolePermission/AdminUser.
export interface AdminPermission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions: Array<{ roleId: string; permissionId: string; permission: AdminPermission }>;
}

export interface AdminUserRoleAssignment {
  userId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; role: UserRole; status: UserStatus };
  role: AdminRole;
}

// ---- POST /admin/media-uploads/upload-requests, /:id/confirm ----
// Admin-only, platform-owned image uploads (real R2 presigned flow, same
// pattern as vendor logo/cover uploads — see LogoCoverPicker.tsx) — added
// 2026-09-03 to back Category.imageUrl with a real file picker instead of
// a hand-typed URL. Not routed through the vendor media pipeline at all
// (that module requires a vendorId); this is its own small parallel
// module, mirroring review-media's REVIEW_PHOTO precedent.
export interface AdminCreateImageUploadRequestBody {
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface AdminImageUploadRequestResult {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

export interface AdminImageConfirmResult {
  id: string;
  status: string;
  url: string | null;
}

// ---- POST /admin/media-uploads/popular-search-image-upload-requests, /:id/confirm ----
// Same presign/confirm shape as AdminImageUploadRequestResult/
// AdminImageConfirmResult above, but tagged POPULAR_SEARCH_IMAGE instead
// of CATEGORY_IMAGE — backs AdminPopularSearchCard.imageUrl (Arch Phase 17).
export interface AdminCreatePopularSearchImageUploadRequestBody {
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface AdminPopularSearchImageUploadRequestResult {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

export interface AdminPopularSearchImageConfirmResult {
  id: string;
  status: string;
  url: string | null;
}

// ---- GET /admin/audit-logs (extended filters) ----
// Server-filterable fields are exactly entityType/entityId/actorId (all
// exact-match) plus pagination — confirmed via buildWhere() read and live
// curl. No action-type or date-range filter exists server-side.
export interface AdminAuditLogFilters {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  page?: number;
  limit?: number;
}

// Arch Phase 17 — CMS & SEO Backend (added 2026-09-04). Backs the admin
// curation screens for the homepage's "Real Wedding Stories" and "Gallery
// Inspiration" sections.

// ---- GET /admin/albums ----
export interface AdminAlbum {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  coverMediaId: string | null;
  visibility: string;
  vendor: { id: string; businessName: string; slug: string };
  coverMedia: { id: string; optimizedObjectKey: string | null; thumbnailObjectKey: string | null; originalObjectKey: string } | null;
}

// POST /admin/albums returns the raw created Album row, no relations —
// same shape gap AdminVendorScalarOnly documents for POST /admin/vendors.
export interface AdminAlbumScalarOnly {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  coverMediaId: string | null;
  visibility: string;
  sortOrder: number;
}

export interface AdminCreateAlbumForVendorBody {
  vendorId: string;
  name: string;
  description?: string;
  visibility?: "PUBLIC" | "PRIVATE";
}

export interface AdminUpdateAlbumBody {
  name?: string;
  description?: string;
  coverMediaId?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  sortOrder?: number;
}

// ---- /admin/media-uploads/vendor-upload-requests ----
// Admin uploading a real PORTFOLIO photo on a vendor's behalf (cold-start
// seeding for Wedding Stories / Gallery Inspiration curation, Arch Phase
// 17) — same presign/confirm shape as AdminImageUploadRequestResult/
// AdminImageConfirmResult below, but the confirm result carries the full
// media row (not just id/status/url) since callers need vendorId/
// moderationStatus to use it immediately in the curation UIs.
export interface AdminVendorUploadRequestResult {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

export interface AdminVendorUploadConfirmResult {
  id: string;
  status: string;
  url: string | null;
}

// ---- GET /admin/media/approved ----
export interface AdminApprovedMedia {
  id: string;
  vendorId: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  originalObjectKey: string;
  altText: string | null;
  vendor: { id: string; businessName: string };
}

// ---- /admin/wedding-stories ----
export interface AdminWeddingStory {
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
    coverMedia: { id: string; optimizedObjectKey: string | null; thumbnailObjectKey: string | null; originalObjectKey: string };
  };
}

export interface AdminCreateWeddingStoryBody {
  albumId: string;
  coupleName: string;
  location: string;
  tag: string;
  snippet: string;
  isFeatured?: boolean;
  sortOrder?: number;
}

export interface AdminUpdateWeddingStoryBody {
  coupleName?: string;
  location?: string;
  tag?: string;
  snippet?: string;
  isFeatured?: boolean;
  sortOrder?: number;
}

// ---- /admin/featured-media ----
export interface AdminFeaturedMedia {
  id: string;
  mediaId: string;
  titleOverride: string | null;
  sortOrder: number;
  media: {
    id: string;
    optimizedObjectKey: string | null;
    thumbnailObjectKey: string | null;
    originalObjectKey: string;
    altText: string | null;
    vendor: {
      id: string;
      businessName: string;
      categories: Array<{ isPrimary: boolean; category: { id: string; name: string } }>;
    };
  };
}

export interface AdminCreateFeaturedMediaBody {
  mediaId: string;
  titleOverride?: string;
  sortOrder?: number;
}

export interface AdminUpdateFeaturedMediaBody {
  titleOverride?: string | null;
  sortOrder?: number;
}

// ---- /admin/popular-searches ----
// Fully standalone, admin-curated content (Arch Phase 17) — no real
// Album/Media entity backs this the way WeddingStory/FeaturedMedia do, so
// there's no nested relation here; imageUrl is a plain resolvable url
// (same shape as Category.imageUrl), set via the platform-owned
// POPULAR_SEARCH_IMAGE upload pipeline (createAdminImageUploadRequest's
// sibling, see admin-client.ts).
export interface AdminPopularSearchCard {
  id: string;
  title: string;
  locationBlurb: string;
  priceLabel: string;
  imageUrl: string | null;
  searchQuery: string;
  isFeatured: boolean;
  sortOrder: number;
}

export interface AdminCreatePopularSearchCardBody {
  title: string;
  locationBlurb: string;
  priceLabel: string;
  imageUrl?: string | null;
  searchQuery: string;
  isFeatured?: boolean;
  sortOrder?: number;
}

export interface AdminUpdatePopularSearchCardBody {
  title?: string;
  locationBlurb?: string;
  priceLabel?: string;
  imageUrl?: string | null;
  searchQuery?: string;
  isFeatured?: boolean;
  sortOrder?: number;
}

// ---- /admin/blog ----
// The last remaining Arch Phase 17 item (added 2026-09-04). Unlike
// AdminPopularSearchCard, this admin shape carries publishedAt (null =
// draft, set = published — publishing is just PATCH-setting this field,
// no separate publish endpoint) plus createdAt/updatedAt, since an admin
// needs to see/manage draft state; the public BlogPost type in
// vendors.types.ts omits all three since every post the public endpoints
// return is already published. coverImageUrl follows the same plain
// resolvable-url shape as AdminPopularSearchCard.imageUrl, set via the
// platform-owned BLOG_COVER_IMAGE upload pipeline (see admin-client.ts).
export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverImageUrl: string | null;
  excerpt: string;
  bodyMarkdown: string;
  readTimeMinutes: number;
  publishedAt: string | null;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCreateBlogPostBody {
  title: string;
  slug?: string;
  category: string;
  coverImageUrl?: string | null;
  excerpt: string;
  bodyMarkdown: string;
  readTimeMinutes: number;
  publishedAt?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface AdminUpdateBlogPostBody {
  title?: string;
  slug?: string;
  category?: string;
  coverImageUrl?: string | null;
  excerpt?: string;
  bodyMarkdown?: string;
  readTimeMinutes?: number;
  publishedAt?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

// ---- POST /admin/media-uploads/blog-cover-image-upload-requests, /:id/confirm ----
// Same presign/confirm shape as AdminCreatePopularSearchImageUploadRequestBody/
// AdminPopularSearchImageUploadRequestResult above, but tagged
// BLOG_COVER_IMAGE instead of POPULAR_SEARCH_IMAGE — backs
// AdminBlogPost.coverImageUrl (Arch Phase 17).
export interface AdminCreateBlogCoverImageUploadRequestBody {
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface AdminBlogCoverImageUploadRequestResult {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

export interface AdminBlogCoverImageConfirmResult {
  id: string;
  status: string;
  url: string | null;
}

// ---- /admin/seo-overrides ----
export type SeoOverridePageType = "CATEGORY" | "CITY" | "CATEGORY_CITY";

export interface AdminSeoOverride {
  id: string;
  pageType: SeoOverridePageType;
  categoryId: string | null;
  locationId: string | null;
  title: string | null;
  description: string | null;
  ogImageUrl: string | null;
  noIndex: boolean;
  category: { id: string; name: string; slug: string } | null;
  location: { id: string; name: string; slug: string; type: string } | null;
}

export interface AdminCreateSeoOverrideBody {
  pageType: SeoOverridePageType;
  categoryId?: string;
  cityId?: string;
  title?: string;
  description?: string;
  ogImageUrl?: string;
  noIndex?: boolean;
}

export interface AdminUpdateSeoOverrideBody {
  title?: string | null;
  description?: string | null;
  ogImageUrl?: string | null;
  noIndex?: boolean;
}

// ---- GET /admin/wedding-websites ----
// Read-only visibility only, per the feature spec's explicit "do not
// build a large admin system for this" instruction — no admin CRUD.
// Verified against wedding-website.repository.ts's ADMIN_LIST_INCLUDE.
export interface AdminWeddingWebsite {
  id: string;
  ownerUserId: string | null;
  ownerTelegramUserId: string | null;
  template: "ROYAL_WEDDING" | "MINIMAL_ELEGANT" | "TRADITIONAL_INDIAN";
  status: "DRAFT" | "PUBLISHED";
  slug: string | null;
  brideName: string;
  groomName: string;
  createdAt: string;
  publishedAt: string | null;
  ownerUser: { id: string; email: string } | null;
  ownerTelegramUser: { id: string; username: string | null; firstName: string | null; lastName: string | null } | null;
  // Most recent payment only (take: 1) — empty array if no publish attempt yet.
  payments: Array<{
    id: string;
    status: "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
    amount: string;
    currency: string;
    createdAt: string;
  }>;
}
