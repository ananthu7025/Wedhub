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
  activeVendors: number;
  paidVendors: number; // ACTIVE or TRIALING subscriptions count as "paid" here
  totalLeads: number;
  totalEnquiries: number;
  conversionRate: number; // fraction 0-1, not a percentage
  revenue: { total: number; thisMonth: number };
  mrr: number; // ACTIVE only (not TRIALING), YEARLY normalized /12
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
