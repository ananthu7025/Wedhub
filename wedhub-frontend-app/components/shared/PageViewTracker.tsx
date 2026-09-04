"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Arch Phase 18 Stage A — "Page view" (product.md §46). Mounted once in the
 * root layout (app/layout.tsx) so it renders on every route, client-side
 * only. Server Components can't observe client-side route changes at all
 * (see next/navigation's usePathname doc — reading the pathname is only
 * supported from a Client Component, precisely so layouts don't re-render
 * on navigation), so a page-view fires from this effect re-running when
 * pathname/searchParams change, rather than from any server-side hook.
 *
 * Wrapped in Suspense per useSearchParams' own requirement: it opts a
 * component out of static rendering unless boundary-wrapped, and the whole
 * point of a page-view tracker is to run on every route without forcing
 * every route to become dynamic.
 */
function PageViewTrackerInner(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    trackEvent({ eventType: "page_view", metadata: { path: search ? `${pathname}?${search}` : pathname } });
  }, [pathname, searchParams]);

  return null;
}

export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}
