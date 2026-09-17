"use client";

import type { ApiResponse } from "./types";
import type {
  CommunityComment,
  CommunityMediaUploadRequest,
  CreateCommunityCommentBody,
  CreateCommunityPostBody,
  CommunityPost,
  ReportCommunityPostBody,
  ToggleVoteResult,
} from "./community.types";

/**
 * Client-side calls through the generic authenticated proxy
 * (app/api/[...path]/route.ts) for the community feed's interactive pieces
 * (vote, comment, post, report) — same shape as account-client.ts.
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

export function createCommunityPost(body: CreateCommunityPostBody) {
  return call<CommunityPost>("/community/posts", "POST", body);
}

export function toggleCommunityVote(postId: string) {
  return call<ToggleVoteResult>(`/community/posts/${postId}/vote`, "POST");
}

export function createCommunityComment(postId: string, body: CreateCommunityCommentBody) {
  return call<CommunityComment>(`/community/posts/${postId}/comments`, "POST", body);
}

export function reportCommunityPost(postId: string, body: ReportCommunityPostBody) {
  return call(`/community/posts/${postId}/report`, "POST", body);
}

export function createCommunityPhotoUploadRequest(filename: string, mimeType: string, fileSize: number) {
  return call<CommunityMediaUploadRequest>("/community-media/upload-requests", "POST", { filename, mimeType, fileSize });
}

export function confirmCommunityPhotoUpload(mediaId: string) {
  return call(`/community-media/${mediaId}/confirm`, "POST");
}
