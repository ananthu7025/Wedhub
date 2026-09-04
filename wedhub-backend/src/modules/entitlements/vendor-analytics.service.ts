import * as entitlementService from "./entitlement.service";
import * as vendorAnalyticsRepository from "./vendor-analytics.repository";
import * as leadRepository from "../leads/lead.repository";

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
//
// Arch Phase 18 Stage B unification: this is now the single merged vendor
// analytics response — product.md §46's full "Vendor analytics" list
// (Impressions, Profile views, Enquiries, Leads, Response rate, Response
// time, Conversion) in one call, rather than making the frontend fetch and
// reconcile this endpoint plus GET /leads/analytics separately. The
// lead-funnel numbers (response rate/time, qualified/won/lost, conversion)
// are computed by leadRepository.getVendorLeadAnalytics, scoped to this same
// tier-based window (`since`) so every field on the response shares one
// windowDays — GET /leads/analytics itself is untouched and keeps returning
// its own all-time numbers for its existing caller (the standalone
// /vendor/analytics dashboard page), since nothing about that contract
// needed to change to satisfy this task. All 7 core metrics are returned to
// every tier per product.md's plain listing (not tier-gated) — only the
// daily breakdown chart stays advanced-only, matching the existing
// profileViewsByDay precedent.
export async function getVendorAnalytics(vendorId: string) {
  const level = await entitlementService.canVendorAccess(vendorId, "analytics_level");
  const windowDays = level === "advanced" ? ADVANCED_WINDOW_DAYS : BASIC_WINDOW_DAYS;
  const since = daysAgo(windowDays);

  const [profileViews, impressions, leads, enquiries, reviews, leadAnalytics] = await Promise.all([
    vendorAnalyticsRepository.countProfileViews(vendorId, since),
    vendorAnalyticsRepository.countImpressions(vendorId, since),
    vendorAnalyticsRepository.countLeads(vendorId, since),
    vendorAnalyticsRepository.countDistinctEnquiries(vendorId, since),
    vendorAnalyticsRepository.countReviews(vendorId, since),
    leadRepository.getVendorLeadAnalytics(vendorId, since),
  ]);

  const summary = {
    level,
    windowDays,
    profileViews,
    impressions,
    leads,
    enquiries,
    reviews,
    responseRate: leadAnalytics.responseRate,
    averageResponseTimeMs: leadAnalytics.averageResponseTimeMs,
    conversionRate: leadAnalytics.conversionRate,
    qualifiedLeads: leadAnalytics.qualifiedLeads,
    wonLeads: leadAnalytics.wonLeads,
    lostLeads: leadAnalytics.lostLeads,
  };

  if (level !== "advanced") {
    return summary;
  }

  const byDay = await vendorAnalyticsRepository.profileViewsByDay(vendorId, since);
  return { ...summary, profileViewsByDay: byDay };
}
