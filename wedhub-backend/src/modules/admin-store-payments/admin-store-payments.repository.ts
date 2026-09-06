import { prisma } from "../../config/database";

export async function getMarketplacePaymentsOverview() {
  const [orders, vendorAccounts] = await Promise.all([
    prisma.vendorStoreOrder.findMany({
      include: {
        refunds: true,
      },
    }),
    prisma.vendorPaymentAccount.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  let totalGmv = 0;
  let totalPaidOrders = 0;
  let totalFailedOrders = 0;
  let totalRefundsAmount = 0;

  for (const o of orders) {
    if (o.paymentStatus === "CAPTURED" || o.paymentStatus === "PARTIALLY_REFUNDED" || o.paymentStatus === "REFUNDED") {
      totalGmv += Number(o.totalAmount);
      totalPaidOrders += 1;
      const orderRefunds = o.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
      totalRefundsAmount += orderRefunds;
    } else if (o.paymentStatus === "FAILED") {
      totalFailedOrders += 1;
    }
  }

  const activeAccountsCount = vendorAccounts.filter((a) => a.status === "ACTIVE").length;
  const pendingAccountsCount = vendorAccounts.filter((a) => a.status === "PENDING_VERIFICATION" || a.status === "ONBOARDING").length;

  return {
    totalGmv,
    totalPaidOrders,
    totalFailedOrders,
    totalRefundsAmount,
    totalPlatformCommission: 0, // Commission is ₹0 for initial phase
    totalAccounts: vendorAccounts.length,
    activeAccountsCount,
    pendingAccountsCount,
  };
}

export function listVendorPaymentAccounts() {
  return prisma.vendorPaymentAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          status: true,
        },
      },
    },
  });
}

export function listAllStoreOrders(filters?: { status?: string; paymentStatus?: string }) {
  return prisma.vendorStoreOrder.findMany({
    where: {
      ...(filters?.status ? { status: filters.status as any } : {}),
      ...(filters?.paymentStatus ? { paymentStatus: filters.paymentStatus as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      store: {
        select: {
          id: true,
          storeName: true,
          slug: true,
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      },
      items: true,
      refunds: true,
    },
  });
}


