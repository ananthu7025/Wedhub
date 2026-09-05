import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type {
  AdminAlbum,
  AdminApprovedMedia,
  AdminAuditLogEntry,
  AdminAuditLogFilters,
  AdminBlogPost,
  AdminDashboardMetrics,
  AdminFeaturedMedia,
  AdminLeadDetail,
  AdminLeadListItem,
  AdminPermission,
  AdminPlan,
  AdminPopularSearchCard,
  AdminReviewDetail,
  AdminReviewListItem,
  AdminRole,
  AdminSeoOverride,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserRoleAssignment,
  AdminVendorDetail,
  AdminVendorListItem,
  AdminVendorStatusHistoryEntry,
  AdminWeddingStory,
  AdminWeddingWebsite,
  ReviewModerationStatus,
  SeoOverridePageType,
  UserRole,
  UserStatus,
} from "./admin.types";
import type { VendorStatus, VerificationLevel } from "./vendor-self.types";
import type { Category, Location, LocationType } from "./vendors.types";
import type { LeadStatus } from "./account.types";

/**
 * Server-only, authenticated reads for the admin platform (Frontend Arch
 * Phase 8). Every route below is gated authenticateMiddleware +
 * authorize(Role.ADMIN) — same two-middleware pattern as vendor/couple
 * routes, no bespoke admin auth. See lib/auth/require-admin.ts for the
 * frontend-side route guard.
 */

export function getAdminDashboard() {
  return apiFetch<AdminDashboardMetrics>("/admin/dashboard");
}

export function listAdminVendors(params: {
  status?: VendorStatus;
  verificationLevel?: VerificationLevel;
  categoryId?: string;
  cityId?: string;
  page?: number;
  limit?: number;
} = {}) {
  return apiFetch<AdminVendorListItem[], PaginationMeta>("/admin/vendors", {
    query: {
      status: params.status,
      verificationLevel: params.verificationLevel,
      categoryId: params.categoryId,
      cityId: params.cityId,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
}

export function getAdminVendorDetail(id: string) {
  return apiFetch<AdminVendorDetail>(`/admin/vendors/${id}`);
}

export function getAdminVendorStatusHistory(id: string) {
  return apiFetch<AdminVendorStatusHistoryEntry[]>(`/admin/vendors/${id}/status-history`);
}

export function listAdminUsers(params: { status?: UserStatus; role?: UserRole; page?: number; limit?: number } = {}) {
  return apiFetch<AdminUserListItem[], PaginationMeta>("/admin/users", {
    query: { status: params.status, role: params.role, page: params.page ?? 1, limit: params.limit ?? 20 },
  });
}

export function getAdminUserDetail(id: string) {
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`);
}

/**
 * Frontend Arch Phase 9 — reuses the same public GET /categories,
 * GET /locations endpoints Phase 2 built against (see admin.types.ts's
 * header comment) with an authenticated call so ?includeInactive=true is
 * honored — these must NOT use skipAuth:true like catalog.ts's public
 * versions, since the backend only respects includeInactive for a real
 * authenticated ADMIN request.
 */
export function listAdminCategories(includeInactive = true) {
  return apiFetch<Category[]>("/categories", { query: { includeInactive } });
}

export function listAdminLocations(type?: LocationType, parentId?: string, includeInactive = true) {
  return apiFetch<Location[]>("/locations", { query: { type, parentId, includeInactive } });
}

export function listAdminLeads(params: { status?: LeadStatus; search?: string; page?: number; limit?: number } = {}) {
  return apiFetch<AdminLeadListItem[], PaginationMeta>("/admin/leads", {
    query: { status: params.status, search: params.search, page: params.page ?? 1, limit: params.limit ?? 20 },
  });
}

export function getAdminLeadDetail(id: string) {
  return apiFetch<AdminLeadDetail>(`/admin/leads/${id}`);
}

export function listAdminReviews(params: { status?: ReviewModerationStatus; page?: number; limit?: number } = {}) {
  return apiFetch<AdminReviewListItem[], PaginationMeta>("/admin/reviews", {
    query: { status: params.status, page: params.page ?? 1, limit: params.limit ?? 20 },
  });
}

export function getAdminReviewDetail(id: string) {
  return apiFetch<AdminReviewDetail>(`/admin/reviews/${id}`);
}

/**
 * Frontend Arch Phase 10 — Admin Monetization, Governance & Audit.
 * See admin.types.ts's header comment for the confirmed backend gaps
 * (no subscriptions/transactions/webhooks list endpoints, coupons is
 * create-only, settings has no backend representation at all).
 */
export function listAdminPlans() {
  return apiFetch<AdminPlan[]>("/admin/plans");
}

export function listAdminRoles() {
  return apiFetch<AdminRole[]>("/admin/roles");
}

export function listAdminPermissions() {
  return apiFetch<AdminPermission[]>("/admin/permissions");
}

export function listAdminUserRoleAssignments() {
  return apiFetch<AdminUserRoleAssignment[]>("/admin/admin-users");
}

export function listAdminAuditLogs(params: AdminAuditLogFilters = {}) {
  return apiFetch<AdminAuditLogEntry[], PaginationMeta>("/admin/audit-logs", {
    query: {
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
}

/** Frontend Arch Phase 17 — CMS & SEO Backend (added 2026-09-04). */

export function listAdminPublicAlbums() {
  return apiFetch<AdminAlbum[]>("/admin/albums");
}

export function listAdminApprovedMedia(page = 1, limit = 50) {
  return apiFetch<AdminApprovedMedia[], PaginationMeta>("/admin/media/approved", { query: { page, limit } });
}

export function listAdminWeddingStories() {
  return apiFetch<AdminWeddingStory[]>("/admin/wedding-stories");
}

export function listAdminFeaturedMedia() {
  return apiFetch<AdminFeaturedMedia[]>("/admin/featured-media");
}

export function listAdminPopularSearchCards() {
  return apiFetch<AdminPopularSearchCard[]>("/admin/popular-searches");
}

// Returns ALL posts including drafts (publishedAt: null) — unlike the
// public /blog list which only ever returns published ones.
export function listAdminBlogPosts() {
  return apiFetch<AdminBlogPost[]>("/admin/blog");
}

export function listAdminSeoOverrides(pageType?: SeoOverridePageType) {
  return apiFetch<AdminSeoOverride[]>("/admin/seo-overrides", { query: { pageType } });
}

export function listAdminWeddingWebsites(page = 1, limit = 20) {
  return apiFetch<AdminWeddingWebsite[], PaginationMeta>("/admin/wedding-websites", { query: { page, limit } });
}

/** Marketplace Direct Payments & Route Settlements */
export function listAdminStorePaymentAccounts() {
  return apiFetch<import("./vendor-store.types").VendorPaymentAccountSummary[]>("/admin/store-payments/accounts");
}

export function listAdminStoreOrders(params: { status?: string; paymentStatus?: string } = {}) {
  return apiFetch<import("./vendor-store.types").VendorStoreOrder[]>("/admin/store-payments/orders", { query: params });
}

export function getAdminStorePaymentMetrics() {
  return apiFetch<import("./vendor-payments-client").AdminStorePaymentMetrics>("/admin/store-payments/overview");
}
