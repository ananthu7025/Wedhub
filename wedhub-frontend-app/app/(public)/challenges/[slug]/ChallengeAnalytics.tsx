"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";

/** Fires challenge_view once per page load — a tiny client leaf, same pattern as ViewCategoryTracker.tsx, so the page itself stays a Server Component. */
export function ChallengeAnalytics({ challengeId, categorySlug }: { challengeId: string; categorySlug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent({ eventType: "challenge_view", metadata: { challengeId, category: categorySlug } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  return null;
}
