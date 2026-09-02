"use client";

import type { ApiResponse } from "./types";
import type { VendorReview } from "./vendors.types";
import type { RespondToReviewBody } from "./reviews.types";

/**
 * Client-side call through the generic authenticated proxy for the vendor
 * reviews page's "respond" action (Frontend Arch Phase 6). Note this hits
 * POST /reviews/:id/respond, not a /vendors/me/* route — ownership is
 * derived backend-side from Review.vendorId -> Vendor.ownerUserId, not
 * getOwnedVendorOrThrow (see lib/api/reviews.types.ts).
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

export function respondToMyReview(reviewId: string, body: RespondToReviewBody) {
  return call<VendorReview>(`/reviews/${reviewId}/respond`, "POST", body);
}
