import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type { CommunityComment, CommunityPost, CommunityTag } from "./community.types";

/**
 * Server-side reads for the couples-only community feature — same
 * three-way split (server reads / client writes / types) as catalog.ts /
 * catalog-client.ts / vendors.types.ts.
 */

export function listCommunityTags() {
  return apiFetch<CommunityTag[]>("/community/tags", { skipAuth: true, public: true, next: { revalidate: 300 } });
}

export function listCommunityFeed(params: { tagId?: string; sort?: "hot" | "new"; page?: number; limit?: number }) {
  return apiFetch<CommunityPost[], PaginationMeta>("/community/posts", {
    query: { tagId: params.tagId, sort: params.sort, page: params.page, limit: params.limit },
  });
}

export function getCommunityPost(id: string) {
  return apiFetch<CommunityPost>(`/community/posts/${id}`);
}

export function listCommunityComments(postId: string) {
  return apiFetch<CommunityComment[]>(`/community/posts/${postId}/comments`, { skipAuth: true, public: true });
}
