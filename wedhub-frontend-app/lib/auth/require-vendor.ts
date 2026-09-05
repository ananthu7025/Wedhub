import "server-only";
import { redirect } from "next/navigation";
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
 * If a vendor account was created but the vendor listing row hasn't been
 * set up yet (e.g. signup wizard interrupted or verification link clicked
 * before completing business name step), redirect to /vendor-onboarding
 * so they can complete profile setup smoothly instead of crashing with 500.
 */
export async function requireVendorOwnership(): Promise<VendorSelf> {
  await requireRole("VENDOR");

  try {
    const { data } = await getMyVendor();
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      redirect("/vendor-onboarding");
    }
    throw error;
  }
}
