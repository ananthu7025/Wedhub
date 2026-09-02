import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type {
  AdminAuditLogEntry,
  AdminDashboardMetrics,
  AdminLeadDetail,
  AdminLeadListItem,
  AdminReviewDetail,
  AdminReviewListItem,
  AdminUserDetail,
  AdminUserListItem,
  AdminVendorDetail,
  AdminVendorListItem,
  AdminVendorStatusHistoryEntry,
  ReviewModerationStatus,
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

export function listAdminAuditLogs(params: { entityType?: string; entityId?: string; actorId?: string; page?: number; limit?: number } = {}) {
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

export function listAdminLeads(params: { status?: LeadStatus; page?: number; limit?: number } = {}) {
  return apiFetch<AdminLeadListItem[], PaginationMeta>("/admin/leads", {
    query: { status: params.status, page: params.page ?? 1, limit: params.limit ?? 20 },
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
