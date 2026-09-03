import "server-only";
import { requireRole } from "./dal";
import type { Session } from "./types";

/**
 * The gate for every (admin) route. Unlike (vendor) (see require-vendor.ts),
 * there's no per-resource ownership check to layer on top here — every
 * /admin/* route mounts authenticateMiddleware + authorize(Role.ADMIN).
 * requireRole only checks the JWT's role claim, though — as of 2026-09-03,
 * authorize() on the backend also requires a real AdminUser -> Role link
 * with at least one permission (docs/bugs.md #2), so a `role: ADMIN` JWT
 * no longer guarantees real access. A user who fails that deeper check
 * still passes requireRole here and only hits a 403 once the page's own
 * data fetch runs — see app/(admin)/error.tsx, which is what actually
 * surfaces that case instead of a generic crash.
 */
export async function requireAdmin(): Promise<Session> {
  return requireRole("ADMIN");
}
