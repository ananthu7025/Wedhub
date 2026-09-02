"use client";

import type { ApiResponse } from "./types";
import type {
  AttachServiceBody,
  CreatePackageBody,
  CreateUploadRequestBody,
  MediaItem,
  PackageSelf,
  SetAttributesBody,
  SetCategoriesBody,
  SetServiceAreasBody,
  UpdateMediaBody,
  UpdatePackageBody,
  UploadRequestResult,
  UpsertProfileBody,
  VendorProfileSelf,
  VendorSelf,
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

export function setMyCategories(body: SetCategoriesBody) {
  return call<VendorSelf>("/vendors/me/categories", "PUT", body);
}

export function setMyServiceAreas(body: SetServiceAreasBody) {
  return call<VendorSelf>("/vendors/me/service-areas", "PUT", body);
}

export function setMyAttributes(body: SetAttributesBody) {
  return call<VendorSelf>("/vendors/me/attributes", "PUT", body);
}

export function attachMyService(body: AttachServiceBody) {
  return call("/vendors/me/services", "POST", body);
}

export function detachMyService(serviceId: string) {
  return call<{ detached: true }>(`/vendors/me/services/${serviceId}`, "DELETE");
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
