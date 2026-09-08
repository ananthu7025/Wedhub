"use client";

import type { ApiResponse } from "./types";
import type {
  ChallengeEntry,
  ChallengeEntryPhotoUploadRequest,
  ChallengeVoteResult,
  CreateChallengeEntryBody,
  SubmitEntryResponse,
} from "./challenges.types";

/**
 * Client-side calls for the Challenge/Contest surface's interactive pieces —
 * mirrors account-client.ts's `call` helper. Every path here goes through
 * the generic authenticated proxy (app/api/[...path]/route.ts) EXCEPT
 * submitChallengeEntry, whose exact path (/api/challenges/:slug/entries) is
 * instead served by a dedicated Route Handler
 * (app/api/challenges/[slug]/entries/route.ts) — Next.js routes an exact
 * dynamic-segment match there ahead of the [...path] catch-all, same
 * precedence as app/api/auth/* over the generic proxy.
 */

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function createChallengeEntryPhotoUploadRequest(filename: string, mimeType: string, fileSize: number) {
  return call<ChallengeEntryPhotoUploadRequest>("/challenge-entry-media/upload-requests", "POST", {
    filename,
    mimeType,
    fileSize,
  });
}

export function confirmChallengeEntryPhotoUpload(mediaId: string) {
  return call(`/challenge-entry-media/${mediaId}/confirm`, "POST");
}

export function submitChallengeEntry(slug: string, body: CreateChallengeEntryBody) {
  return call<SubmitEntryResponse>(`/challenges/${slug}/entries`, "POST", body);
}

export function castChallengeVote(slug: string, entryId: string) {
  return call<ChallengeVoteResult>(`/challenges/${slug}/entries/${entryId}/votes`, "POST");
}

export function getMyChallengeEntry(slug: string) {
  return call<ChallengeEntry | null>(`/challenges/${slug}/my-entry`, "GET");
}
