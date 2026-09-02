import * as entitlementService from "./entitlement.service";
import * as vendorAnalyticsRepository from "./vendor-analytics.repository";

const BASIC_WINDOW_DAYS = 30;
const ADVANCED_WINDOW_DAYS = 90;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// product.md §26/§54: FREE gets "basic analytics", PRO/PREMIUM get
// "advanced analytics" — gated through canVendorAccess(ANALYTICS_LEVEL),
// never a raw plan-tier check. Both tiers query the same underlying
// AnalyticsEvent/Lead/Review data (there's no separate "advanced" data
// source yet — that's Arch Phase 18's full pipeline); the entitlement
// difference for now is the lookback window and whether a day-by-day
// breakdown is included.
export async function getVendorAnalytics(vendorId: string) {
  const level = await entitlementService.canVendorAccess(vendorId, "analytics_level");
  const windowDays = level === "advanced" ? ADVANCED_WINDOW_DAYS : BASIC_WINDOW_DAYS;
  const since = daysAgo(windowDays);

  const [profileViews, leads, reviews] = await Promise.all([
    vendorAnalyticsRepository.countProfileViews(vendorId, since),
    vendorAnalyticsRepository.countLeads(vendorId, since),
    vendorAnalyticsRepository.countReviews(vendorId, since),
  ]);

  const summary = { level, windowDays, profileViews, leads, reviews };

  if (level !== "advanced") {
    return summary;
  }

  const byDay = await vendorAnalyticsRepository.profileViewsByDay(vendorId, since);
  return { ...summary, profileViewsByDay: byDay };
}
