import { z } from "zod";

// Client-fired analytics events (Arch Phase 18 Stage A): page_view,
// vendor_impression, vendor_click, filter_changed, enquiry_started,
// subscription_viewed, etc — anything that only ever happens in the
// browser with no natural server-side hook. eventType is deliberately a
// free-text string (matching AnalyticsEvent.eventType), not a fixed enum —
// the same "narrow, generic event log" posture as logAnalyticsEvent itself,
// so new client-only event types never need a schema change here.
//
// vendorId is validated as a well-formed uuid when present but NOT checked
// against the database — this is a high-volume, best-effort ingestion path
// and an existence query here would be pure overhead (same reasoning as
// logAnalyticsEvent not verifying vendorId).
export const trackEventSchema = z.object({
  eventType: z.string().trim().min(1).max(100),
  vendorId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrackEventBody = z.infer<typeof trackEventSchema>;
