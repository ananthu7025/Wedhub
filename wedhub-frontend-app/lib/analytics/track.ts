"use client";

/**
 * Arch Phase 18 Stage A — client-side event tracking for events that only
 * ever happen in the browser (page view, vendor impression/click, filter
 * change, enquiry-form-opened, subscription-page view). Posts through the
 * SAME-ORIGIN authenticated proxy (app/api/[...path]/route.ts), never
 * directly at the backend origin — that proxy is what attaches the
 * logged-in user's Bearer token server-side when a session cookie exists,
 * so a tracked event is attributed to a real userId without this file ever
 * touching the token itself. lib/api/client.ts's apiFetch can't be reused
 * here: it's "server-only" (imports next/headers), so Client Components
 * are only ever able to reach the backend through this proxy.
 *
 * Fire-and-forget by design, matching logAnalyticsEvent's own
 * never-blocks/never-fails posture on the backend: nothing here awaits a
 * response, and every failure is swallowed silently. navigator.sendBeacon
 * is used when available — critical for trackEvent calls fired from a
 * click handler that navigates away immediately (see VendorCard's click
 * tracking), since a plain fetch() can be cancelled mid-flight by the
 * browser tearing down the page. `fetch(..., { keepalive: true })` is the
 * fallback for browsers/contexts without sendBeacon (sendBeacon only
 * supports POST with a same-origin URL and a small body, which every call
 * site here satisfies).
 */

const TRACK_URL = "/api/analytics/events";

export interface TrackEventInput {
  eventType: string;
  vendorId?: string;
  metadata?: Record<string, unknown>;
}

export function trackEvent(input: TrackEventInput): void {
  if (typeof window === "undefined") return;

  try {
    const payload = JSON.stringify(input);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      // sendBeacon requires a Blob (or similar) with an explicit content
      // type for the proxy/backend's JSON body parser to accept it — a
      // plain string blob defaults to text/plain.
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(TRACK_URL, blob);
      if (sent) return;
      // sendBeacon returns false if the browser's per-origin queue is full
      // — fall through to fetch as a best-effort retry rather than
      // silently dropping the event.
    }

    void fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "include",
      keepalive: true,
    }).catch(() => {
      // Best-effort — a dropped analytics event must never surface to the
      // user or break the interaction it's observing.
    });
  } catch {
    // Never let tracking break the feature it's instrumenting.
  }
}
