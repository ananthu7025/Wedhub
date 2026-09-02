"use client";

import type { ApiResponse } from "./types";
import type {
  AdminCreateInvitationBody,
  AdminCreateVendorBody,
  AdminReasonBody,
  AdminSetVerificationBody,
  AdminSuspendUserResult,
  AdminUpdateVendorBody,
  AdminVendorInvitation,
  AdminVendorScalarOnly,
} from "./admin.types";

/**
 * Client-side calls through the generic authenticated proxy for the admin
 * platform's interactive pieces (Frontend Arch Phase 8).
 */

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function createAdminVendor(body: AdminCreateVendorBody) {
  return call<AdminVendorScalarOnly>("/admin/vendors", "POST", body);
}

export function createAdminVendorInvitation(vendorId: string, body: AdminCreateInvitationBody) {
  return call<AdminVendorInvitation>(`/admin/vendors/${vendorId}/invitations`, "POST", body);
}

export function updateAdminVendor(id: string, body: AdminUpdateVendorBody) {
  return call<AdminVendorScalarOnly>(`/admin/vendors/${id}`, "PATCH", body);
}

export function setAdminVendorVerification(id: string, body: AdminSetVerificationBody) {
  return call<AdminVendorScalarOnly>(`/admin/vendors/${id}/verify`, "POST", body);
}

export function approveAdminVendor(id: string) {
  return call<AdminVendorScalarOnly>(`/admin/vendors/${id}/approve`, "POST");
}

export function rejectAdminVendor(id: string, body: AdminReasonBody) {
  return call<AdminVendorScalarOnly>(`/admin/vendors/${id}/reject`, "POST", body);
}

export function suspendAdminVendor(id: string, body: AdminReasonBody) {
  return call<AdminVendorScalarOnly>(`/admin/vendors/${id}/suspend`, "POST", body);
}

export function restoreAdminVendor(id: string) {
  return call<AdminVendorScalarOnly>(`/admin/vendors/${id}/restore`, "POST");
}

export function deactivateAdminVendor(id: string) {
  return call<AdminVendorScalarOnly>(`/admin/vendors/${id}/deactivate`, "POST");
}

export function suspendAdminUser(id: string, body: AdminReasonBody) {
  return call<AdminSuspendUserResult>(`/admin/users/${id}/suspend`, "POST", body);
}

export function restoreAdminUser(id: string) {
  return call<AdminSuspendUserResult>(`/admin/users/${id}/restore`, "POST");
}
