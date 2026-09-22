"use client";

import type { ApiResponse } from "./types";
import type {
  CreateAlbumBody,
  CreatePackageBody,
  CreateUploadRequestBody,
  MediaItem,
  PackageSelf,
  SetAttributesBody,
  SetCategoriesBody,
  SetHiddenSectionsBody,
  SetServiceAreasBody,
  StoryCollaboratorSelf,
  SubmitWeddingStoryBody,
  UpdateAlbumBody,
  UpdateMediaBody,
  UpdatePackageBody,
  UploadRequestResult,
  UpsertProfileBody,
  VendorAlbumSelf,
  VendorProfileSelf,
  VendorSelf,
  WeddingStorySelf,
} from "./vendor-self.types";

/**
 * Client-side calls through the generic authenticated proxy
 * (app/api/[...path]/route.ts) for the vendor self-service surface's
 * interactive pieces (Frontend Arch Phase 5).
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

export function upsertMyProfile(body: UpsertProfileBody) {
  return call<VendorProfileSelf>("/vendors/me/profile", "PUT", body);
}

export function updateMyVendorDetail(body: { businessName?: string }) {
  return call<VendorSelf>("/vendors/me/detail", "PATCH", body);
}

export function setMyCategories(body: SetCategoriesBody) {
  return call<VendorSelf>("/vendors/me/categories", "PUT", body);
}

export function setMyServiceAreas(body: SetServiceAreasBody) {
  return call<VendorSelf>("/vendors/me/service-areas", "PUT", body);
}

export function setMyHiddenSections(body: SetHiddenSectionsBody) {
  return call<VendorSelf>("/vendors/me/hidden-sections", "PUT", body);
}

export function setMyAttributes(body: SetAttributesBody) {
  return call<VendorSelf>("/vendors/me/attributes", "PUT", body);
}

export function createMyPackage(body: CreatePackageBody) {
  return call<PackageSelf>("/vendors/me/packages", "POST", body);
}

export function updateMyPackage(packageId: string, body: UpdatePackageBody) {
  return call<PackageSelf>(`/vendors/me/packages/${packageId}`, "PATCH", body);
}

export function deleteMyPackage(packageId: string) {
  return call<{ deleted: true }>(`/vendors/me/packages/${packageId}`, "DELETE");
}

export function submitMyVendor() {
  return call<VendorSelf>("/vendors/me/submit", "POST");
}

export function createMediaUploadRequest(body: CreateUploadRequestBody) {
  return call<UploadRequestResult>("/media/upload-requests", "POST", body);
}

export function listMyMediaClient() {
  return call<MediaItem[]>("/media/me", "GET");
}

export function confirmMediaUpload(mediaId: string) {
  return call<MediaItem>(`/media/${mediaId}/confirm`, "POST");
}

export function updateMedia(mediaId: string, body: UpdateMediaBody) {
  return call<MediaItem>(`/media/${mediaId}`, "PATCH", body);
}

export function deleteMedia(mediaId: string) {
  return call<{ deleted: true }>(`/media/${mediaId}`, "DELETE");
}

// Items 10/11 — vendor album management, a prerequisite for submitting a
// wedding story (see (vendor)/vendor/stories/).
export function createMyAlbum(body: CreateAlbumBody) {
  return call<VendorAlbumSelf>("/vendors/me/albums", "POST", body);
}

export function listMyAlbumsClient() {
  return call<VendorAlbumSelf[]>("/vendors/me/albums", "GET");
}

export function updateMyAlbum(albumId: string, body: UpdateAlbumBody) {
  return call<VendorAlbumSelf>(`/vendors/me/albums/${albumId}`, "PATCH", body);
}

export function deleteMyAlbum(albumId: string) {
  return call<{ deleted: true }>(`/vendors/me/albums/${albumId}`, "DELETE");
}

export function submitMyWeddingStory(body: SubmitWeddingStoryBody) {
  return call<WeddingStorySelf>("/vendors/me/wedding-stories", "POST", body);
}

export function respondToStoryCollaboration(storyId: string, decision: "CONFIRMED" | "DECLINED") {
  return call<StoryCollaboratorSelf>(`/vendors/me/wedding-stories/${storyId}/respond`, "POST", { decision });
}
