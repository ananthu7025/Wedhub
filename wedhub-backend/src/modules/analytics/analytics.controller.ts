import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import type { TrackEventBody } from "./analytics.schema";

// Public, best-effort ingestion for browser-only events (page view, vendor
// impression/click, filter change, enquiry-form-opened, subscription-page
// view — see analytics.routes.ts). Deliberately does NOT await anything
// slow: logAnalyticsEvent already never throws and never blocks on a slow
// query plan (a single-row insert), so awaiting it here is cheap and lets a
// genuine DB outage still surface as a fast 202 rather than a hang — but the
// route responds regardless of the outcome, matching the client's
// fire-and-forget (sendBeacon/keepalive) call.
export async function trackEvent(req: Request, res: Response): Promise<void> {
  const body = req.body as TrackEventBody;
  void logAnalyticsEvent({
    userId: req.user?.id,
    eventType: body.eventType,
    vendorId: body.vendorId,
    metadata: body.metadata,
  });
  res.status(202).json(successResponse({ accepted: true }));
}
