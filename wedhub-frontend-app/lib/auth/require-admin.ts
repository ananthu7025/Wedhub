import "server-only";
import { requireRole } from "./dal";
import type { Session } from "./types";

/**
 * The gate for every (admin) route. Unlike (vendor) (see require-vendor.ts),
 * admin routes are purely role-gated on the backend — confirmed via
 * research that every /admin/* route mounts
 * authenticateMiddleware + authorize(Role.ADMIN) with no ownership check
 * layered on top (there's nothing to "own"). requireRole alone is
 * therefore sufficient; no extra backend call is needed to confirm
 * anything beyond the JWT's role claim.
 */
export async function requireAdmin(): Promise<Session> {
  return requireRole("ADMIN");
}
