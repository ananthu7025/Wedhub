"use client";

import type { ApiResponse, PaginationMeta } from "./types";
import type {
  CastPollVoteResult,
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

async function callPaginated<T>(path: string): Promise<ApiResponse<T> & { meta?: PaginationMeta }> {
  const response = await fetch(`/api${path}`, { credentials: "include" });
  return (await response.json()) as ApiResponse<T> & { meta?: PaginationMeta };
}

// "Load more" on the feed fetches subsequent pages from a Client Component
// — apiFetch (community.ts) is server-only (uses next/headers), same lesson
// documented in catalog-client.ts/messaging-client.ts, so this duplicates
// that one GET as a client-callable proxy call instead.
export function listCommunityFeedClient(params: { tagId?: string; sort?: "hot" | "new"; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params.tagId) query.set("tagId", params.tagId);
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  return callPaginated<CommunityPost[]>(`/community/posts?${query.toString()}`);
}

export function createCommunityPost(body: CreateCommunityPostBody) {
  return call<CommunityPost>("/community/posts", "POST", body);
}

export function toggleCommunityVote(postId: string) {
  return call<ToggleVoteResult>(`/community/posts/${postId}/vote`, "POST");
}

export function castCommunityPollVote(postId: string, optionId: string) {
  return call<CastPollVoteResult>(`/community/posts/${postId}/poll-vote`, "POST", { optionId });
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
