"use client";

import type { ApiResponse } from "./types";
import type { LeadNote, UpdateLeadStatusBody, VendorLeadDetail } from "./leads.types";

/**
 * Client-side calls through the generic authenticated proxy
 * (app/api/[...path]/route.ts) for the leads master-detail view's
 * interactive pieces (Frontend Arch Phase 6).
 */

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function getMyLeadClient(leadId: string) {
  return call<VendorLeadDetail>(`/leads/${leadId}`, "GET");
}

export function updateMyLeadStatus(leadId: string, body: UpdateLeadStatusBody) {
  return call<VendorLeadDetail>(`/leads/${leadId}/status`, "PATCH", body);
}

export function addMyLeadNote(leadId: string, body: string) {
  return call<LeadNote>(`/leads/${leadId}/notes`, "POST", { body });
}
