import * as adminPaymentsRepo from "./admin-store-payments.repository";

export async function getMarketplaceOverview() {
  return adminPaymentsRepo.getMarketplacePaymentsOverview();
}

export async function listVendorAccounts() {
  const accounts = await adminPaymentsRepo.listVendorPaymentAccounts();
  return accounts.map((a) => ({
    id: a.id,
    vendorId: a.vendorId,
    vendorBusinessName: a.vendor.businessName,
    vendorSlug: a.vendor.slug,
    vendorStatus: a.vendor.status,
    razorpayAccountId: a.razorpayAccountId,
    status: a.status,
    legalBusinessName: a.legalBusinessName,
    businessType: a.businessType,
    bankName: a.bankName,
    accountNumberMasked: a.accountNumberMasked,
    chargesEnabled: a.chargesEnabled,
    payoutsEnabled: a.payoutsEnabled,
    createdAt: a.createdAt,
  }));
}

export async function listAllStoreOrders(filters?: { status?: string; paymentStatus?: string }) {
  const orders = await adminPaymentsRepo.listAllStoreOrders(filters);
  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    storeId: o.storeId,
    storeName: o.store.storeName,
    storeSlug: o.store.slug,
    vendorBusinessName: o.store.vendor.businessName,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    totalAmount: Number(o.totalAmount),
    subtotal: Number(o.subtotal),
    gstAmount: Number(o.gstAmount),
    orderChannel: o.orderChannel,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentProvider: o.paymentProvider,
    razorpayOrderId: o.razorpayOrderId,
    razorpayPaymentId: o.razorpayPaymentId,
    paidAt: o.paidAt,
    refunds: o.refunds.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      reason: r.reason,
      createdAt: r.createdAt,
    })),
    createdAt: o.createdAt,
  }));
}

export async function cleanupAbandonedOrders(olderThanMinutes: number = 60) {
  const result = await adminPaymentsRepo.cleanupStalePendingOrders(olderThanMinutes);
  return {
    cancelledOrdersCount: result.count,
    olderThanMinutes,
  };
}

