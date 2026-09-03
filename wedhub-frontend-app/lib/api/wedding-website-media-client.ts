"use client";

import type { ApiResponse } from "./types";
import type { WeddingWebsiteMedia, WeddingWebsiteUploadRequestResult } from "./wedding-website.types";

/**
 * Client-side calls through the generic authenticated proxy for wedding-
 * website photo uploads (cover, couple photo, gallery). Reuses the same
 * R2 presign -> PUT -> confirm pipeline as every other media upload flow
 * in this app, but note: confirmUpload here returns the RAW Media row
 * (status + object keys), not a precomputed {id,status,url} projection
 * like the admin vendor-photo uploader — callers must resolve the
 * display URL themselves via getPublicMediaUrl(objectKeyFor(media)) once
 * status is READY, not by checking a `.url` field.
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

export function createWeddingWebsiteUploadRequest(body: { weddingWebsiteId: string; filename: string; mimeType: string; fileSize: number }) {
  return call<WeddingWebsiteUploadRequestResult>("/wedding-website-media/upload-requests", "POST", body);
}

export function confirmWeddingWebsiteUpload(mediaId: string) {
  return call<WeddingWebsiteMedia>(`/wedding-website-media/${mediaId}/confirm`, "POST");
}

export function deleteWeddingWebsiteMedia(mediaId: string) {
  return call<{ deleted: true }>(`/wedding-website-media/${mediaId}`, "DELETE");
}
