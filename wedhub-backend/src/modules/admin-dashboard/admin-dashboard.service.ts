import * as adminDashboardRepository from "./admin-dashboard.repository";

const NEW_REGISTRATIONS_WINDOW_DAYS = 30;

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

  const [
    totalUsers,
    newRegistrations,
    totalVendors,
    activeVendors,
    paidVendorGroups,
    totalLeads,
    wonLeads,
    totalEnquiries,
    totalRevenue,
    revenueThisMonth,
    activeSubscriptionPlans,
  ] = await Promise.all([
    adminDashboardRepository.countUsers(),
    adminDashboardRepository.countNewRegistrations(daysAgo(NEW_REGISTRATIONS_WINDOW_DAYS)),
    adminDashboardRepository.countVendors(),
    adminDashboardRepository.countActiveVendors(),
    adminDashboardRepository.countPaidVendors(),
    adminDashboardRepository.countLeads(),
    adminDashboardRepository.countWonLeads(),
    adminDashboardRepository.countEnquiries(),
    adminDashboardRepository.sumRevenue({ since: undefined }),
    adminDashboardRepository.sumRevenue({ since: monthStart }),
    adminDashboardRepository.listActiveSubscriptionPlanPrices(),
  ]);

  return {
    totalUsers,
    newRegistrations: { count: newRegistrations, windowDays: NEW_REGISTRATIONS_WINDOW_DAYS },
    totalVendors,
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
    mrr: computeMrr(activeSubscriptionPlans),
  };
}
