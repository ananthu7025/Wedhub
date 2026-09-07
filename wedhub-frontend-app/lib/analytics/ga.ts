/**
 * GA4 (Google Analytics) config + thin gtag wrapper. Additive alongside the
 * existing first-party trackEvent()/logAnalyticsEvent pipeline (lib/
 * analytics/track.ts) — that pipeline stays the source of truth for
 * itsmyKalyanam's own internal analytics/reporting; this module only mirrors
 * the same business events into GA4 so they're visible in Google Search
 * Console-adjacent tooling (GA4 conversions, Google Ads audiences, etc).
 *
 * GA_MEASUREMENT_ID is intentionally read from a public env var (GA4
 * Measurement IDs are not secret — they're visible in every page's rendered
 * HTML/network requests) and is optional: with it unset, gtag() below is a
 * no-op and <GoogleAnalytics> (see components/shared/GoogleAnalytics.tsx)
 * renders nothing, so this feature degrades safely in any environment
 * that hasn't configured GA4 yet (e.g. local dev).
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fire-and-forget gtag call — safe to call even when GA hasn't loaded (script not injected, ad-blocked, or ID unset). */
export function gtag(...args: unknown[]): void {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  if (typeof window.gtag !== "function") return;
  window.gtag(...args);
}
