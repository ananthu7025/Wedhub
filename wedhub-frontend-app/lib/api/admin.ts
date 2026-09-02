import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type {
  AdminAuditLogEntry,
  AdminDashboardMetrics,
  AdminUserDetail,
  AdminUserListItem,
  AdminVendorDetail,
  AdminVendorListItem,
  AdminVendorStatusHistoryEntry,
  UserRole,
  UserStatus,
} from "./admin.types";
import type { VendorStatus, VerificationLevel } from "./vendor-self.types";

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
