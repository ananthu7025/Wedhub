import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";

/**
 * Every (couple) route requires an authenticated END_USER — proxy.ts does the
 * cheap optimistic redirect, this is the real enforcement point (see
 * lib/auth/dal.ts's header comment and frontenddocs/03-stage-foundation.md).
 *
 * robots: noindex here is page-level defense in depth — these routes are
 * also disallowed at the crawl-directive level in app/robots.ts, but a
 * signed-out crawler that ignores robots.txt disallow would otherwise still
 * see indexable account/dashboard pages (SEO audit finding).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CoupleLayout({ children }: { children: React.ReactNode }) {
  await requireRole("END_USER");
  return <>{children}</>;
}
