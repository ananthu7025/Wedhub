"use client";

import type { ApiResponse } from "./types";
import type { Challenge, ChallengeEntry } from "./challenges.types";

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export interface AdminCreateChallengeBody {
  title: string;
  categoryId: string;
  galleryCategoryId?: string;
  description?: string;
  bannerImage?: string;
  startDate: string;
  endDate: string;
  votingStartDate: string;
  votingEndDate: string;
  voteScope?: "PER_ENTRY" | "PER_CHALLENGE";
  hideLiveRankingsBeforeEndHours?: number;
  allowMultipleEntriesPerVendor?: boolean;
  maxEntries?: number;
  prizeTitle?: string;
  prizeDescription?: string;
  prizeValue?: string;
  sponsorName?: string;
  sponsorLogo?: string;
  sponsorUrl?: string;
  rules?: string;
  termsAndConditions?: string;
}

export type AdminUpdateChallengeBody = Partial<AdminCreateChallengeBody> & { status?: Challenge["status"] };

export function createAdminChallenge(body: AdminCreateChallengeBody) {
  return call<Challenge>("/admin/challenges", "POST", body);
}

export function updateAdminChallenge(id: string, body: AdminUpdateChallengeBody) {
  return call<Challenge>(`/admin/challenges/${id}`, "PATCH", body);
}

export function setAdminChallengeWinner(id: string, entryId: string) {
  return call<Challenge>(`/admin/challenges/${id}/set-winner`, "POST", { entryId });
}

export function promoteChallengeEntriesToGallery(id: string, entryIds: string[], galleryCategoryId: string) {
  return call<{ promoted: number; skipped: string[] }>(`/admin/challenges/${id}/promote-to-gallery`, "POST", {
    entryIds,
    galleryCategoryId,
  });
}

export function approveAdminChallengeEntry(entryId: string) {
  return call<ChallengeEntry>(`/admin/challenge-entries/${entryId}/approve`, "PATCH");
}

export function rejectAdminChallengeEntry(entryId: string, reason?: string) {
  return call<ChallengeEntry>(`/admin/challenge-entries/${entryId}/reject`, "PATCH", { reason });
}

export function disqualifyAdminChallengeEntry(entryId: string, reason?: string) {
  return call<ChallengeEntry>(`/admin/challenge-entries/${entryId}/disqualify`, "PATCH", { reason });
}
