"use client";

import type { ApiResponse, PaginationMeta } from "./types";
import type { LeadNote, UpdateLeadStatusBody, VendorLead, VendorLeadDetail } from "./leads.types";

/**
 * Client-side calls through the generic authenticated proxy
 * (app/api/[...path]/route.ts) for the leads master-detail view's
 * interactive pieces (Frontend Arch Phase 6).
 */

async function call<T, M = Record<string, unknown>>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResponse<T, M>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T, M>;
}

export function getMyLeadClient(leadId: string) {
  return call<VendorLeadDetail>(`/leads/${leadId}`, "GET");
}

// Backs the booking calendar's client picker (BookingModal.tsx) — only
// leads this vendor has actually been contacted through the platform by, or
// exchanged messages with (every Lead is enquiry-derived; there's no
// separate "vendor cold-outreach" concept — see that component's own
// comment), so the dropdown only ever offers contacts genuinely relevant to
// this vendor. Reuses GET /leads' existing `search` param (matches
// enquiry.contactName/contactEmail/message) rather than a new endpoint.
export function searchMyLeadsClient(keyword: string, limit = 8) {
  return call<VendorLead[], PaginationMeta>(
    `/leads?search=${encodeURIComponent(keyword)}&limit=${limit}`,
    "GET",
  );
}

export function updateMyLeadStatus(leadId: string, body: UpdateLeadStatusBody) {
  return call<VendorLeadDetail>(`/leads/${leadId}/status`, "PATCH", body);
}

export function addMyLeadNote(leadId: string, body: string) {
  return call<LeadNote>(`/leads/${leadId}/notes`, "POST", { body });
}
