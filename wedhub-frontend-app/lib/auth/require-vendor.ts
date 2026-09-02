import "server-only";
import { requireRole } from "./dal";
import { getMyVendor } from "@/lib/api/vendor-self";
import { ApiRequestError } from "@/lib/api/types";
import type { VendorSelf } from "@/lib/api/vendor-self.types";

/**
 * The real gate for every (vendor) route. Confirmed via backend research
 * (Frontend Arch Phase 5) that /vendors/me/* is ownership-gated, not
 * role-gated — a VENDOR-role user with no vendor row yet gets a 404 from
 * every /me/* route, not a 403. So role alone (requireRole("VENDOR")) is
 * necessary but not sufficient; this also confirms a vendor row actually
 * exists by calling the real GET /vendors/me/detail, same as any other
 * consumer would, rather than trusting the JWT claim alone.
 *
 * In normal operation every VENDOR-role user has a vendor row by the time
 * they reach here — SignupWizard.tsx calls POST /vendors as part of signup
 * itself, so there's no separate "vendor onboarding" landing page to send
 * a role-but-no-vendor user to. That combination should only be reachable
 * via an inconsistent account state, not a normal user path, so it's
 * treated as a hard error rather than a redirect to a page that doesn't
 * correspond to any real flow.
 */
export async function requireVendorOwnership(): Promise<VendorSelf> {
  await requireRole("VENDOR");

  try {
    const { data } = await getMyVendor();
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      throw new Error(
        "Your account is marked as a vendor but has no vendor listing yet. Please contact support.",
      );
    }
    throw error;
  }
}
