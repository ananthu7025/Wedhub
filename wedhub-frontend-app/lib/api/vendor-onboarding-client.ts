"use client";

import type { ApiResponse } from "./types";
import type { VendorSelf } from "./vendor-self.types";

/**
 * POST /vendors — the one-time vendor-creation call, distinct from every
 * other /vendors/me/* self-service endpoint (this is the only one gated by
 * role, not ownership — see lib/auth/require-vendor.ts's header comment).
 * Called once during vendor signup (SignupWizard.tsx) since register()
 * alone never creates a Vendor row.
 */
export async function createVendor(businessName: string): Promise<ApiResponse<VendorSelf>> {
  const response = await fetch("/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessName }),
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<VendorSelf>;
}
