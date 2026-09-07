"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Fires the GA4-mirrored "view_category" event once when a category/city/
 * category+city SEO landing page (SeoLandingPage.tsx, the Server Component
 * these render inside) is viewed. A tiny client leaf, same pattern as
 * PageViewTracker.tsx — the landing page itself stays a Server Component
 * for SEO (see lib/analytics/track.ts's GA4 event-name mapping).
 */
export function ViewCategoryTracker({
  categoryId,
  categoryName,
  locationName,
  vendorCount,
}: {
  categoryId?: string;
  categoryName?: string;
  locationName?: string;
  vendorCount: number;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent({
      eventType: "view_category",
      metadata: {
        vendor_category: categoryName,
        location: locationName,
        results_count: vendorCount,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, locationName]);

  return null;
}
