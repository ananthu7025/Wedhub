import { requireRole } from "@/lib/auth/dal";

/**
 * Every (couple) route requires an authenticated END_USER — proxy.ts does the
 * cheap optimistic redirect, this is the real enforcement point (see
 * lib/auth/dal.ts's header comment and frontenddocs/03-stage-foundation.md).
 */
export default async function CoupleLayout({ children }: { children: React.ReactNode }) {
  await requireRole("END_USER");
  return <>{children}</>;
}
