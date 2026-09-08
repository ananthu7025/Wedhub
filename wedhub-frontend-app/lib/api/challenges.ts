import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type { Challenge, ChallengeEntry } from "./challenges.types";

/**
 * Server-only, public reads for the Challenge/Contest surface — mirrors
 * catalog.ts's pattern. Short revalidate windows (30-60s, vs catalog.ts's
 * typical 300s) since vote counts and entry approval status change far more
 * often than vendor/category listings.
 */

export function getActiveChallenge(params: { categoryId?: string; gallerySlug?: string }) {
  return apiFetch<Challenge | null>("/challenges/active", {
    query: { categoryId: params.categoryId, gallerySlug: params.gallerySlug },
    skipAuth: true,
    public: true,
    next: { revalidate: 60 },
  });
}

export function getChallengeBySlug(slug: string) {
  return apiFetch<Challenge>(`/challenges/${slug}`, { skipAuth: true, public: true, next: { revalidate: 60 } });
}

export function listChallenges(params: { status?: string } = {}) {
  return apiFetch<Challenge[]>("/challenges", {
    query: { status: params.status },
    skipAuth: true,
    public: true,
    next: { revalidate: 300 },
  });
}

export function getChallengeEntries(slug: string, params: { page?: number; limit?: number; sort?: "votes" | "recent" } = {}) {
  return apiFetch<ChallengeEntry[], PaginationMeta & { myVotedEntryIds: string[] }>(`/challenges/${slug}/entries`, {
    query: { page: params.page ?? 1, limit: params.limit ?? 20, sort: params.sort ?? "votes" },
    skipAuth: true,
    public: true,
    next: { revalidate: 60 },
  });
}

export function getChallengeEntryById(slug: string, entryId: string) {
  return apiFetch<ChallengeEntry, { hasVotedByMe: boolean }>(`/challenges/${slug}/entries/${entryId}`, {
    skipAuth: true,
    public: true,
    next: { revalidate: 60 },
  });
}

export function getChallengeRankings(slug: string, params: { page?: number; limit?: number } = {}) {
  return apiFetch<ChallengeEntry[], PaginationMeta & { frozen: boolean; myVotedEntryIds: string[] }>(
    `/challenges/${slug}/rankings`,
    {
      query: { page: params.page ?? 1, limit: params.limit ?? 50 },
      skipAuth: true,
      public: true,
      next: { revalidate: 30 },
    },
  );
}
