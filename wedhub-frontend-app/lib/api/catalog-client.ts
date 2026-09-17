"use client";

import type { ApiResponse, PaginationMeta } from "./types";
import type { Category, FeaturedMediaItem, Location, LocationType } from "./vendors.types";

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

/**
 * Client-side counterparts to lib/api/catalog.ts's listCategories/
 * listLocations — that file is server-only (apiFetch imports next/headers),
 * so any Client Component wizard (couple profile-setup, vendor onboarding)
 * needing these lists at interaction time (not just initial server render)
 * must use these instead. Same lesson as messaging-client.ts's
 * listConversationMessagesClient — this bug class is invisible to
 * `tsc --noEmit` and only shows up as a real Next.js build error at runtime.
 */
export async function listCategoriesClient(): Promise<ApiResponse<Category[]>> {
  const response = await fetch("/api/categories");
  return (await response.json()) as ApiResponse<Category[]>;
}

export async function listLocationsClient(type?: LocationType): Promise<ApiResponse<Location[]>> {
  const query = type ? `?type=${type}` : "";
  const response = await fetch(`/api/locations${query}`);
  return (await response.json()) as ApiResponse<Location[]>;
}
