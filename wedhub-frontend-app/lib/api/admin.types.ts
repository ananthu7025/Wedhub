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
