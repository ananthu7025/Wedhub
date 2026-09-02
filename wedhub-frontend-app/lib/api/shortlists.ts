import { apiFetch } from "./client";
import type { Shortlist, ComparisonResult } from "./shortlists.types";

/**
 * Server-only, authenticated reads for the couple app (Frontend Arch Phase 3).
 * See lib/api/shortlists.types.ts's header comment for source verification.
 */

export function listMyShortlists() {
  return apiFetch<Shortlist[]>("/shortlists");
}

export function compareVendors(vendorIds: string[]) {
  return apiFetch<ComparisonResult>("/comparison/vendors", {
    query: { vendorIds: vendorIds.join(",") },
    skipAuth: true,
  });
}
