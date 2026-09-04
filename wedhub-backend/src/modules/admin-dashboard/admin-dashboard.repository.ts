import { prisma } from "../../config/database";

export function countUsers() {
  return prisma.user.count();
}

export function countNewRegistrations(since: Date) {
  return prisma.user.count({ where: { createdAt: { gte: since } } });
}

export function countVendors() {
  return prisma.vendor.count();
}

export function countNewVendors(since: Date) {
  return prisma.vendor.count({ where: { createdAt: { gte: since } } });
}

export function countActiveVendors() {
  return prisma.vendor.count({ where: { status: "APPROVED" } });
}

// A vendor with any subscription currently ACTIVE or TRIALING — implicit
// FREE (no row) or PAST_DUE/CANCELLED/EXPIRED are not "paid" right now.
export function countPaidVendors() {
  return prisma.subscription.groupBy({
    by: ["vendorId"],
    where: { status: { in: ["ACTIVE", "TRIALING"] } },
  });
}

export function countLeads() {
  return prisma.lead.count();
}

export function countWonLeads() {
  return prisma.lead.count({ where: { status: "WON" } });
}

export function countEnquiries() {
  return prisma.enquiry.count();
}

export function sumRevenue(filter: { since: Date | undefined }) {
  return prisma.invoice.aggregate({
    where: { status: "PAID", ...(filter.since ? { issuedAt: { gte: filter.since } } : {}) },
    _sum: { amount: true },
  });
}

// MRR: every currently-ACTIVE subscription's plan price, YEARLY plans
// normalized to a monthly figure. TRIALING is deliberately excluded — no
// revenue has actually been collected yet for a trial.
export function listActiveSubscriptionPlanPrices() {
  return prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    select: { plan: { select: { price: true, billingInterval: true } } },
  });
}

// Search demand: raw volume over the window, matching the same "count in
// window" shape as countNewRegistrations/countNewVendors above.
export function countSearches(since: Date) {
  return prisma.searchLog.count({ where: { createdAt: { gte: since } } });
}

// Top searched keywords over the window — cheap groupBy, capped small since
// this backs a "top N" admin list, not a full search-analytics breakdown.
// Blank/null keywords (browse-by-filter searches with no typed query) are
// excluded — they're not a "keyword" signal.
export async function topSearchKeywords(since: Date, limit: number) {
  const rows = await prisma.searchLog.groupBy({
    by: ["keyword"],
    where: { createdAt: { gte: since }, keyword: { not: null } },
    _count: { keyword: true },
    orderBy: { _count: { keyword: "desc" } },
    take: limit,
  });
  return rows.map((row) => ({ keyword: row.keyword as string, count: row._count.keyword }));
}

// Churn numerator: subscriptions that actually reached CANCELLED status
// within the window. Deliberately NOT "cancelledAt IS NOT NULL" alone —
// cancelledAt is also stamped the moment a vendor merely *requests*
// cancel-at-period-end (subscription.service.ts's cancelSubscription),
// while status stays ACTIVE until the period actually ends. Counting a
// still-ACTIVE, still-paying subscription as churned would overstate churn,
// so this only counts subscriptions whose status is CANCELLED and whose
// cancellation timestamp falls inside the window.
export function countCancelledInWindow(since: Date) {
  return prisma.subscription.count({
    where: { status: "CANCELLED", cancelledAt: { gte: since } },
  });
}

// Churn denominator: subscriptions "active at the start of the window" —
// approximated as any subscription that already existed before the window
// began (createdAt < since) and had not already been cancelled before the
// window started (cancelledAt is null OR falls inside/after the window).
// This is a defensible proxy rather than a full historical-status
// reconstruction (there's no subscription-status-history table to replay
// "what was the status exactly at time T"): it captures "subscriptions that
// were still a going concern as of the window start and therefore could
// have churned during it."
export function countActiveAtWindowStart(since: Date) {
  return prisma.subscription.count({
    where: {
      createdAt: { lt: since },
      OR: [{ cancelledAt: null }, { cancelledAt: { gte: since } }],
    },
  });
}
