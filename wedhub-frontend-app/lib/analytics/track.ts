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
 *
 * SEO project addition: every call also mirrors into GA4 (gtag) via
 * toGa4Event() below, best-effort and independent of the first-party post
 * above — a GA4 failure/absence never affects the first-party pipeline and
 * vice versa. Only non-PII fields are forwarded (vendorId/category/location/
 * slug/search terms — never email/phone/name; see each call site's
 * metadata). GA4 event names follow Google's recommended-event naming
 * where one exists (search, select_content, generate_lead); everything else
 * keeps this codebase's existing eventType as the GA4 event name too, so
 * the two pipelines' event catalogs stay easy to cross-reference.
 */

import { gtag } from "./ga";

const TRACK_URL = "/api/analytics/events";

export interface TrackEventInput {
  eventType: string;
  vendorId?: string;
  metadata?: Record<string, unknown>;
}

// Maps this codebase's internal eventType to a GA4 event name + param
// shape. Falls back to sending eventType verbatim with metadata spread as
// params for anything not listed here, so new internal events still reach
// GA4 without requiring an edit here — this table only exists to rename a
// handful of events to GA4/Google Ads' own recommended-event vocabulary.
function toGa4Event(input: TrackEventInput): { name: string; params: Record<string, unknown> } {
  const { eventType, vendorId, metadata = {} } = input;
  const base = { vendor_id: vendorId, ...metadata };

  switch (eventType) {
    case "page_view":
      return { name: "page_view", params: { page_path: metadata.path } };
    case "vendor_impression":
      return { name: "view_vendor", params: base };
    case "vendor_click":
      return { name: "select_vendor", params: base };
    case "enquiry_started":
      return { name: "contact_vendor", params: base };
    case "enquiry_completed":
      return { name: "lead_generated", params: base };
    case "portfolio_whatsapp_click":
      return { name: "whatsapp_click", params: base };
    case "portfolio_call_click":
      return { name: "phone_click", params: base };
    case "email_click":
      return { name: "email_click", params: base };
    case "portfolio_view":
      return { name: "view_vendor", params: base };
    case "search":
      return { name: "search", params: base };
    case "view_category":
      return { name: "view_category", params: base };
    case "view_package":
      return { name: "view_package", params: base };
    case "vendor_registration_started":
      return { name: "vendor_registration_started", params: base };
    case "vendor_registration_completed":
      return { name: "vendor_registration_completed", params: base };
    default:
      return { name: eventType, params: base };
  }
}

export function trackEvent(input: TrackEventInput): void {
  if (typeof window === "undefined") return;

  try {
    const { name, params } = toGa4Event(input);
    gtag("event", name, params);
  } catch {
    // GA4 mirroring must never break the first-party pipeline below.
  }

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
