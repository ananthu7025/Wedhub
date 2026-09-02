"use client";

import type { ApiResponse } from "./types";
import type {
  AdminCoupon,
  AdminCreateAttributeBody,
  AdminCreateCategoryBody,
  AdminCreateCouponBody,
  AdminCreateInvitationBody,
  AdminCreateLocationBody,
  AdminCreatePlanBody,
  AdminCreateVendorBody,
  AdminLeadStatusUpdateResult,
  AdminModerateReviewBody,
  AdminPlan,
  AdminReasonBody,
  AdminReviewStatusUpdateResult,
  AdminSetVerificationBody,
  AdminSuspendUserResult,
  AdminUpdateAttributeBody,
  AdminUpdateCategoryBody,
  AdminUpdateLeadStatusBody,
  AdminUpdateLocationBody,
  AdminUpdatePlanBody,
  AdminUpdateVendorBody,
  AdminVendorInvitation,
  AdminVendorScalarOnly,
} from "./admin.types";
import type { Category, CategoryAttribute, Location, LocationType } from "./vendors.types";

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

/** Frontend Arch Phase 9 — Admin Catalog & Moderation. */

export function createAdminCategory(body: AdminCreateCategoryBody) {
  return call<Category>("/categories", "POST", body);
}

export function updateAdminCategory(id: string, body: AdminUpdateCategoryBody) {
  return call<Category>(`/categories/${id}`, "PATCH", body);
}

export function createAdminAttribute(categoryId: string, body: AdminCreateAttributeBody) {
  return call<CategoryAttribute>(`/categories/${categoryId}/attributes`, "POST", body);
}

export function updateAdminAttribute(categoryId: string, attributeId: string, body: AdminUpdateAttributeBody) {
  return call<CategoryAttribute>(`/categories/${categoryId}/attributes/${attributeId}`, "PATCH", body);
}

export function deleteAdminAttribute(categoryId: string, attributeId: string) {
  return call<{ deleted: true }>(`/categories/${categoryId}/attributes/${attributeId}`, "DELETE");
}

export function listAdminLocationsClient(type: LocationType, parentId: string) {
  return call<Location[]>(`/locations?type=${type}&parentId=${parentId}&includeInactive=true`, "GET");
}

export function createAdminLocation(body: AdminCreateLocationBody) {
  return call<Location>("/locations", "POST", body);
}

export function updateAdminLocation(id: string, body: AdminUpdateLocationBody) {
  return call<Location>(`/locations/${id}`, "PATCH", body);
}

export function updateAdminLeadStatus(id: string, body: AdminUpdateLeadStatusBody) {
  return call<AdminLeadStatusUpdateResult>(`/admin/leads/${id}/status`, "PATCH", body);
}

export function moderateAdminReview(id: string, body: AdminModerateReviewBody) {
  return call<AdminReviewStatusUpdateResult>(`/admin/reviews/${id}/status`, "PATCH", body);
}

/** Frontend Arch Phase 10 — Admin Monetization, Governance & Audit. */

export function createAdminPlan(body: AdminCreatePlanBody) {
  return call<AdminPlan>("/admin/plans", "POST", body);
}

export function updateAdminPlan(id: string, body: AdminUpdatePlanBody) {
  return call<AdminPlan>(`/admin/plans/${id}`, "PATCH", body);
}

// The only coupon endpoint that exists — no list/update/delete (confirmed
// via research). Kept here rather than admin.ts since it's a mutation.
export function createAdminCoupon(body: AdminCreateCouponBody) {
  return call<AdminCoupon>("/admin/subscriptions/coupons", "POST", body);
}
