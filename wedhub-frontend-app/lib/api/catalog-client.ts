"use client";

import type { ApiResponse, PaginationMeta } from "./types";
import type { FeaturedMediaItem } from "./vendors.types";

/**
 * Client-side call through the generic proxy (app/api/[...path]/route.ts) —
 * same shape as shortlists-client.ts. Needed because the /gallery page's
 * infinite scroll fetches subsequent pages from a Client Component, and
 * apiFetch (client.ts) is server-only (uses next/headers). This endpoint is
 * public, so the proxy forwards it unauthenticated exactly as it would with
 * a session attached.
 */
export async function listFeaturedGalleryMediaClient(params: {
  page: number;
  limit: number;
  category?: string;
}): Promise<ApiResponse<FeaturedMediaItem[], PaginationMeta>> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.category) query.set("category", params.category);

  const response = await fetch(`/api/gallery/featured/homepage?${query.toString()}`, {
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<FeaturedMediaItem[], PaginationMeta>;
}
