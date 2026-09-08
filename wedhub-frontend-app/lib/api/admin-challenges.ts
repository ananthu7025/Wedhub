import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type { Challenge, ChallengeEntry } from "./challenges.types";

/**
 * Server-only, authenticated reads for the admin Challenge/Contest surface —
 * gated authenticateMiddleware + authorize(Role.ADMIN) on the backend, same
 * pattern as the rest of lib/api/admin.ts. Reuses Challenge/ChallengeEntry
 * from challenges.types.ts rather than duplicating near-identical Admin*
 * types, since the admin include shape matches the public one field-for-field
 * (challenge.repository.ts's CHALLENGE_INCLUDE is used for both).
 */

export function listAdminChallenges(status?: string) {
  return apiFetch<Challenge[]>("/admin/challenges", { query: { status } });
}

export function getAdminChallenge(id: string) {
  return apiFetch<Challenge>(`/admin/challenges/${id}`);
}

export function listAdminChallengeEntries(params: { challengeId?: string; status?: string; page?: number; limit?: number } = {}) {
  return apiFetch<ChallengeEntry[], PaginationMeta>("/admin/challenge-entries", {
    query: { challengeId: params.challengeId, status: params.status, page: params.page ?? 1, limit: params.limit ?? 50 },
  });
}
