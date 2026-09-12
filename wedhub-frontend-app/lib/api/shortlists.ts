import { apiFetch } from "./client";
import type { Shortlist, ComparisonResult } from "./shortlists.types";

/**
 * Server-only, authenticated reads for the couple app (Frontend Arch Phase 3).
 * See lib/api/shortlists.types.ts's header comment for source verification.
 */

export function listMyShortlists() {
  return apiFetch<Shortlist[]>("/shortlists");
}

// Vendor ids across all of the caller's shortlists — used to seed
// VendorHeartButton's initialFavorited on pages that render many vendor
// cards (search results, vendor profile) so the heart reflects real
// shortlist state on load instead of always starting "unfavorited" and
// desyncing (409-on-click) for an already-shortlisted vendor.
export async function listMyShortlistedVendorIds(): Promise<Set<string>> {
  const { data: shortlists } = await listMyShortlists();
  return new Set(shortlists.flatMap((s) => s.items.map((item) => item.vendorId)));
}

export function compareVendors(vendorIds: string[]) {
  return apiFetch<ComparisonResult>("/comparison/vendors", {
    query: { vendorIds: vendorIds.join(",") },
    skipAuth: true,
  });
}
