import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type { LeadStatus } from "./account.types";
import type { LeadAnalytics, VendorLead, VendorLeadDetail } from "./leads.types";

/**
 * Server-only, authenticated reads for the vendor-facing leads module
 * (Frontend Arch Phase 6). Mounted at /api/v1/leads, ownership-gated the
 * same way as /vendors/me/* (getOwnedVendorOrThrow in every controller
 * function) — no vendorId param needed, the backend derives "my" leads from
 * the session.
 */

export function listMyLeads(params: { status?: LeadStatus; search?: string; page?: number; limit?: number } = {}) {
  return apiFetch<VendorLead[], PaginationMeta>("/leads", {
    query: { status: params.status, search: params.search, page: params.page ?? 1, limit: params.limit ?? 50 },
  });
}

export function getMyLead(leadId: string) {
  return apiFetch<VendorLeadDetail>(`/leads/${leadId}`);
}

export function getMyLeadAnalytics() {
  return apiFetch<LeadAnalytics>("/leads/analytics");
}
