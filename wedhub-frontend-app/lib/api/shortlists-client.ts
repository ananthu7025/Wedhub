"use client";

import type { ApiResponse } from "./types";
import type { CreateEnquiryResult, CreateSingleVendorEnquiryBody } from "./shortlists.types";

/**
 * Client-side calls through the generic authenticated proxy (app/api/[...path]/route.ts).
 * Used by interactive pieces (heart-toggle, enquiry modal, compare selection)
 * that can't be plain Server Components.
 */

export async function addFavorite(vendorId: string): Promise<ApiResponse<{ added: true }>> {
  const response = await fetch("/api/shortlists/favorites/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendorId }),
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<{ added: true }>;
}

export async function removeFavorite(vendorId: string): Promise<ApiResponse<{ removed: true }>> {
  const response = await fetch(`/api/shortlists/favorites/items/${vendorId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<{ removed: true }>;
}

export async function createSingleVendorEnquiry(
  body: CreateSingleVendorEnquiryBody,
): Promise<ApiResponse<CreateEnquiryResult>> {
  const response = await fetch("/api/enquiries/single-vendor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<CreateEnquiryResult>;
}
