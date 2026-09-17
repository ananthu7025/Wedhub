"use client";

import type { ApiResponse, PaginationMeta } from "./types";
import type { Category, FeaturedMediaItem, Location, LocationType, VendorSearchResult } from "./vendors.types";

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

// Items 10/11 — lets a vendor search other vendors by business name to tag
// as a story collaborator (StoriesBoard.tsx), at interaction time (not
// initial server render), same reasoning as the two functions above.
export async function searchVendorsClient(params: { keyword?: string; limit?: number }): Promise<ApiResponse<VendorSearchResult[]>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  query.set("limit", String(params.limit ?? 10));
  const response = await fetch(`/api/search/vendors?${query.toString()}`, { credentials: "include" });
  return (await response.json()) as ApiResponse<VendorSearchResult[]>;
}

// Vendor contact-details gating: GET /vendors/:slug never includes real
// phone/email/website (backend redacts them — see vendor.controller.ts's
// redactContactFields). This is the only way to fetch the real values,
// called from VendorContactLinks.tsx only after the couple explicitly
// clicks "Reveal contact details" — the backend requires a logged-in
// session and logs the reveal as a contact_details_revealed analytics
// event, which is what a vendor's "Recent profile viewers" list shows
// distinctly from a plain view.
export async function revealVendorContactClient(
  slug: string,
): Promise<ApiResponse<{ phone: string | null; email: string | null; website: string | null }>> {
  const response = await fetch(`/api/vendors/${slug}/reveal-contact`, { method: "POST", credentials: "include" });
  return (await response.json()) as ApiResponse<{ phone: string | null; email: string | null; website: string | null }>;
}
