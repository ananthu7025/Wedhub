"use client";

import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/ga";

/**
 * Loads gtag.js once, globally (mounted in app/layout.tsx alongside the
 * existing PageViewTracker). Renders nothing when
 * NEXT_PUBLIC_GA_MEASUREMENT_ID is unset, so environments without a GA4
 * property configured (local dev, preview) are unaffected.
 *
 * strategy="afterInteractive" — loads after the page is interactive rather
 * than blocking initial render, per Next's own guidance for analytics
 * scripts, so this doesn't compete with LCP-critical resources.
 *
 * send_page_view: false — the initial pageview GA's inline snippet would
 * otherwise auto-fire is suppressed here. Route-level page_view events are
 * instead sent explicitly from PageViewTracker.tsx (trackEvent's GA4 mirror,
 * see lib/analytics/track.ts), the same single place already responsible
 * for driving the first-party pipeline's page_view on every route change —
 * this is what prevents a duplicate page_view on both first load and every
 * client-side navigation in this App Router SPA.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false, anonymize_ip: true });
          window.gtag = gtag;
        `}
      </Script>
    </>
  );
}
