"use client";

import type { ApiResponse } from "./types";
import type {
  CreateReviewBody,
  MyReview,
  ReviewMediaUploadRequest,
  UpsertWeddingProfileBody,
} from "./account.types";

/**
 * Client-side calls through the generic authenticated proxy
 * (app/api/[...path]/route.ts) for the couple account surface's
 * interactive pieces (Frontend Arch Phase 4).
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

export function createReviewPhotoUploadRequest(filename: string, mimeType: string, fileSize: number) {
  return call<ReviewMediaUploadRequest>("/review-media/upload-requests", "POST", { filename, mimeType, fileSize });
}

export function confirmReviewPhotoUpload(mediaId: string) {
  return call(`/review-media/${mediaId}/confirm`, "POST");
}

export function createReview(body: CreateReviewBody) {
  return call<MyReview>("/reviews", "POST", body);
}

export function markNotificationRead(id: string) {
  return call<{ marked: true }>(`/notifications/me/${id}/read`, "POST");
}

export function markAllNotificationsRead() {
  return call<{ marked: true }>("/notifications/me/read-all", "POST");
}

export function updateWeddingProfile(body: UpsertWeddingProfileBody) {
  return call("/users/me/wedding-profile", "PUT", body);
}

export function deactivateAccount() {
  return call<{ status: "DEACTIVATED" }>("/users/me/deactivate", "POST");
}

export function deleteAccount() {
  return call<{ deleted: true }>("/users/me", "DELETE");
}
