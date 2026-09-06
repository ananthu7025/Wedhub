"use client";

import type { ApiResponse } from "./types";
import type {
  AdminAlbumScalarOnly,
  AdminBlogCoverImageConfirmResult,
  AdminBlogCoverImageUploadRequestResult,
  AdminBlogPost,
  AdminCoupon,
  AdminCreateAlbumForVendorBody,
  AdminCreateAttributeBody,
  AdminCreateBlogCoverImageUploadRequestBody,
  AdminCreateBlogPostBody,
  AdminCreateCategoryBody,
  AdminCreateCouponBody,
  AdminCreateFeaturedMediaBody,
  AdminCreateGalleryCategoryBody,
  AdminCreateImageUploadRequestBody,
  AdminCreateInspirationImageUploadRequestBody,
  AdminCreateInvitationBody,
  AdminCreateLocationBody,
  AdminCreatePlanBody,
  AdminCreatePopularSearchCardBody,
  AdminCreatePopularSearchImageUploadRequestBody,
  AdminCreateSeoOverrideBody,
  AdminCreateServiceBody,
  AdminCreateVendorBody,
  AdminCreateWeddingStoryBody,
  AdminFeaturedMedia,
  AdminImageConfirmResult,
  AdminImageUploadRequestResult,
  AdminInspirationImageConfirmResult,
  AdminInspirationImageUploadRequestResult,
  AdminLeadStatusUpdateResult,
  AdminModerateReviewBody,
  AdminPlan,
  AdminPopularSearchCard,
  AdminPopularSearchImageConfirmResult,
  AdminPopularSearchImageUploadRequestResult,
  AdminReasonBody,
  AdminReviewStatusUpdateResult,
  AdminSeoOverride,
  AdminSetVerificationBody,
  AdminSuspendUserResult,
  AdminUpdateAlbumBody,
  AdminUpdateAttributeBody,
  AdminUpdateBlogPostBody,
  AdminUpdateCategoryBody,
  AdminUpdateFeaturedMediaBody,
  AdminUpdateGalleryCategoryBody,
  AdminUpdateLeadStatusBody,
  AdminUpdateLocationBody,
  AdminUpdatePlanBody,
  AdminUpdatePopularSearchCardBody,
  AdminUpdateSeoOverrideBody,
  AdminUpdateServiceBody,
  AdminUpdateVendorBody,
  AdminUpdateWeddingStoryBody,
  AdminVendorInvitation,
  AdminVendorScalarOnly,
  AdminVendorUploadConfirmResult,
  AdminVendorUploadRequestResult,
  AdminWeddingStory,
} from "./admin.types";
import type { Category, CategoryAttribute, GalleryCategory, Location, LocationType, Service } from "./vendors.types";

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

export function createAdminService(categoryId: string, body: AdminCreateServiceBody) {
  return call<Service>(`/categories/${categoryId}/services`, "POST", body);
}

export function updateAdminService(categoryId: string, serviceId: string, body: AdminUpdateServiceBody) {
  return call<Service>(`/categories/${categoryId}/services/${serviceId}`, "PATCH", body);
}

export function deleteAdminService(categoryId: string, serviceId: string) {
  return call<{ deleted: true }>(`/categories/${categoryId}/services/${serviceId}`, "DELETE");
}

export function createAdminGalleryCategory(body: AdminCreateGalleryCategoryBody) {
  return call<GalleryCategory>("/admin/gallery-categories", "POST", body);
}

export function updateAdminGalleryCategory(id: string, body: AdminUpdateGalleryCategoryBody) {
  return call<GalleryCategory>(`/admin/gallery-categories/${id}`, "PATCH", body);
}

export function deleteAdminGalleryCategory(id: string) {
  return call<{ deleted: true }>(`/admin/gallery-categories/${id}`, "DELETE");
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

// Real R2 presigned upload flow for admin-owned platform images (e.g. a
// Category's homepage image) — added 2026-09-03, see admin.types.ts's
// header comment above AdminImageUploadRequestResult.
export function createAdminImageUploadRequest(body: AdminCreateImageUploadRequestBody) {
  return call<AdminImageUploadRequestResult>("/admin/media-uploads/upload-requests", "POST", body);
}

export function confirmAdminImageUpload(mediaId: string) {
  return call<AdminImageConfirmResult>(`/admin/media-uploads/${mediaId}/confirm`, "POST");
}

// Same real R2 presign -> PUT -> confirm flow as createAdminImageUploadRequest/
// confirmAdminImageUpload above, for a PopularSearchCard's image instead of
// a Category's (Arch Phase 17, added 2026-09-04) — POPULAR_SEARCH_IMAGE
// instead of CATEGORY_IMAGE, see admin.types.ts's header comment.
export function createAdminPopularSearchImageUploadRequest(body: AdminCreatePopularSearchImageUploadRequestBody) {
  return call<AdminPopularSearchImageUploadRequestResult>(
    "/admin/media-uploads/popular-search-image-upload-requests",
    "POST",
    body,
  );
}

export function confirmAdminPopularSearchImageUpload(mediaId: string) {
  return call<AdminPopularSearchImageConfirmResult>(
    `/admin/media-uploads/popular-search-image-upload-requests/${mediaId}/confirm`,
    "POST",
  );
}

// Same real R2 presign -> PUT -> confirm flow as
// createAdminPopularSearchImageUploadRequest/confirmAdminPopularSearchImageUpload
// above, for a BlogPost's cover image instead of a PopularSearchCard's
// (Arch Phase 17, added 2026-09-04) — BLOG_COVER_IMAGE instead of
// POPULAR_SEARCH_IMAGE, see admin.types.ts's header comment.
export function createAdminBlogCoverImageUploadRequest(body: AdminCreateBlogCoverImageUploadRequestBody) {
  return call<AdminBlogCoverImageUploadRequestResult>(
    "/admin/media-uploads/blog-cover-image-upload-requests",
    "POST",
    body,
  );
}

export function confirmAdminBlogCoverImageUpload(mediaId: string) {
  return call<AdminBlogCoverImageConfirmResult>(
    `/admin/media-uploads/blog-cover-image-upload-requests/${mediaId}/confirm`,
    "POST",
  );
}

// Same real R2 presign -> PUT -> confirm flow as the popular-search/
// blog-cover pairs above, for a standalone Gallery Inspiration photo with
// no owning vendor — INSPIRATION_PHOTO instead of POPULAR_SEARCH_IMAGE/
// BLOG_COVER_IMAGE, see admin.types.ts's header comment.
export function createAdminInspirationImageUploadRequest(body: AdminCreateInspirationImageUploadRequestBody) {
  return call<AdminInspirationImageUploadRequestResult>(
    "/admin/media-uploads/inspiration-image-upload-requests",
    "POST",
    body,
  );
}

export function confirmAdminInspirationImageUpload(mediaId: string) {
  return call<AdminInspirationImageConfirmResult>(
    `/admin/media-uploads/inspiration-image-upload-requests/${mediaId}/confirm`,
    "POST",
  );
}

// Admin uploading a real PORTFOLIO photo on a vendor's behalf — cold-start
// seeding for Wedding Stories / Gallery Inspiration curation (Arch Phase
// 17) when no vendor has uploaded their own approved photos yet.
export function createAdminVendorUploadRequest(body: {
  vendorId: string;
  albumId?: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}) {
  return call<AdminVendorUploadRequestResult>("/admin/media-uploads/vendor-upload-requests", "POST", body);
}

export function confirmAdminVendorUpload(mediaId: string) {
  return call<AdminVendorUploadConfirmResult>(`/admin/media-uploads/vendor-upload-requests/${mediaId}/confirm`, "POST");
}

export function createAdminAlbumForVendor(body: AdminCreateAlbumForVendorBody) {
  return call<AdminAlbumScalarOnly>("/admin/albums", "POST", body);
}

export function updateAdminAlbum(id: string, body: AdminUpdateAlbumBody) {
  return call<AdminAlbumScalarOnly>(`/admin/albums/${id}`, "PATCH", body);
}

/** Frontend Arch Phase 17 — CMS & SEO Backend (added 2026-09-04). */

export function createAdminWeddingStory(body: AdminCreateWeddingStoryBody) {
  return call<AdminWeddingStory>("/admin/wedding-stories", "POST", body);
}

export function updateAdminWeddingStory(id: string, body: AdminUpdateWeddingStoryBody) {
  return call<AdminWeddingStory>(`/admin/wedding-stories/${id}`, "PATCH", body);
}

export function deleteAdminWeddingStory(id: string) {
  return call<{ deleted: true }>(`/admin/wedding-stories/${id}`, "DELETE");
}

export function createAdminFeaturedMedia(body: AdminCreateFeaturedMediaBody) {
  return call<AdminFeaturedMedia>("/admin/featured-media", "POST", body);
}

export function updateAdminFeaturedMedia(id: string, body: AdminUpdateFeaturedMediaBody) {
  return call<AdminFeaturedMedia>(`/admin/featured-media/${id}`, "PATCH", body);
}

export function deleteAdminFeaturedMedia(id: string) {
  return call<{ deleted: true }>(`/admin/featured-media/${id}`, "DELETE");
}

export function createAdminPopularSearchCard(body: AdminCreatePopularSearchCardBody) {
  return call<AdminPopularSearchCard>("/admin/popular-searches", "POST", body);
}

export function updateAdminPopularSearchCard(id: string, body: AdminUpdatePopularSearchCardBody) {
  return call<AdminPopularSearchCard>(`/admin/popular-searches/${id}`, "PATCH", body);
}

export function deleteAdminPopularSearchCard(id: string) {
  return call<{ deleted: true }>(`/admin/popular-searches/${id}`, "DELETE");
}

// Publishing is just PATCH-setting publishedAt — no separate publish
// endpoint, matching how isFeatured toggles work elsewhere.
export function createAdminBlogPost(body: AdminCreateBlogPostBody) {
  return call<AdminBlogPost>("/admin/blog", "POST", body);
}

export function updateAdminBlogPost(id: string, body: AdminUpdateBlogPostBody) {
  return call<AdminBlogPost>(`/admin/blog/${id}`, "PATCH", body);
}

export function deleteAdminBlogPost(id: string) {
  return call<{ deleted: true }>(`/admin/blog/${id}`, "DELETE");
}

export function createAdminSeoOverride(body: AdminCreateSeoOverrideBody) {
  return call<AdminSeoOverride>("/admin/seo-overrides", "POST", body);
}

export function updateAdminSeoOverride(id: string, body: AdminUpdateSeoOverrideBody) {
  return call<AdminSeoOverride>(`/admin/seo-overrides/${id}`, "PATCH", body);
}

export function deleteAdminSeoOverride(id: string) {
  return call<{ deleted: true }>(`/admin/seo-overrides/${id}`, "DELETE");
}
