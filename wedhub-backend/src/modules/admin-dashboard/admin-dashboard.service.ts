import * as adminDashboardRepository from "./admin-dashboard.repository";

const NEW_REGISTRATIONS_WINDOW_DAYS = 30;
const TOP_SEARCH_KEYWORDS_LIMIT = 10;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function computeMrr(rows: { plan: { price: unknown; billingInterval: "MONTHLY" | "YEARLY" } }[]): number {
  return rows.reduce((total, row) => {
    const price = Number(row.plan.price);
    const monthly = row.plan.billingInterval === "YEARLY" ? price / 12 : price;
    return total + monthly;
  }, 0);
}

export async function getDashboardMetrics() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const windowStart = daysAgo(NEW_REGISTRATIONS_WINDOW_DAYS);

  const [
    totalUsers,
    newRegistrations,
    totalVendors,
    newVendors,
    activeVendors,
    paidVendorGroups,
    totalLeads,
    wonLeads,
    totalEnquiries,
    totalRevenue,
    revenueThisMonth,
    activeSubscriptionPlans,
    searchCount,
    topKeywords,
    cancelledInWindow,
    activeAtWindowStart,
  ] = await Promise.all([
    adminDashboardRepository.countUsers(),
    adminDashboardRepository.countNewRegistrations(windowStart),
    adminDashboardRepository.countVendors(),
    adminDashboardRepository.countNewVendors(windowStart),
    adminDashboardRepository.countActiveVendors(),
    adminDashboardRepository.countPaidVendors(),
    adminDashboardRepository.countLeads(),
    adminDashboardRepository.countWonLeads(),
    adminDashboardRepository.countEnquiries(),
    adminDashboardRepository.sumRevenue({ since: undefined }),
    adminDashboardRepository.sumRevenue({ since: monthStart }),
    adminDashboardRepository.listActiveSubscriptionPlanPrices(),
    adminDashboardRepository.countSearches(windowStart),
    adminDashboardRepository.topSearchKeywords(windowStart, TOP_SEARCH_KEYWORDS_LIMIT),
    adminDashboardRepository.countCancelledInWindow(windowStart),
    adminDashboardRepository.countActiveAtWindowStart(windowStart),
  ]);

  const mrr = computeMrr(activeSubscriptionPlans);

  return {
    totalUsers,
    newRegistrations: { count: newRegistrations, windowDays: NEW_REGISTRATIONS_WINDOW_DAYS },
    totalVendors,
    newVendors: { count: newVendors, windowDays: NEW_REGISTRATIONS_WINDOW_DAYS },
    activeVendors,
    paidVendors: paidVendorGroups.length,
    totalLeads,
    totalEnquiries,
    // product.md §39 lists "Conversion" with no defined formula in either
    // source doc — defined here as leads WON / total leads (product.md
    // §23's own "Conversion outcome" vendor-dashboard language), confirmed
    // with the user rather than guessed silently.
    conversionRate: totalLeads > 0 ? wonLeads / totalLeads : 0,
    revenue: {
      total: Number(totalRevenue._sum.amount ?? 0),
      thisMonth: Number(revenueThisMonth._sum.amount ?? 0),
    },
    mrr,
    // ARR: MRR × 12, the universal SaaS-metric convention — not a
    // separately-tracked figure, just MRR annualized.
    arr: mrr * 12,
    // Search demand: product.md §46 lists this as its own platform metric.
    // SearchLog already logs every real search (search.service.ts); this is
    // a raw volume count over the same window as newRegistrations/newVendors,
    // plus a top-N keyword breakdown for admin signal beyond a bare count.
    searchDemand: {
      count: searchCount,
      windowDays: NEW_REGISTRATIONS_WINDOW_DAYS,
      topKeywords,
    },
    // Churn rate: subscriptions that reached CANCELLED status within the
    // window, divided by subscriptions that were still active as of the
    // window's start (see countCancelledInWindow/countActiveAtWindowStart
    // doc comments in the repository for exactly what each side counts and
    // why). Divide-by-zero guarded the same way conversionRate is above.
    churnRate: activeAtWindowStart > 0 ? cancelledInWindow / activeAtWindowStart : 0,
  };
}
