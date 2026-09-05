"use client";

import type { ApiResponse } from "./types";
import type {
  OnboardPaymentAccountInput,
  RefundStoreOrderInput,
  VendorPaymentAccountSummary,
  VendorPaymentMetrics,
  VerifyStorePaymentInput,
  VendorStoreOrder,
} from "./vendor-store.types";

async function call<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

// ---------------------------------------------------------------------------
// Vendor Payment Account Actions
// ---------------------------------------------------------------------------

export function getMyPaymentAccount() {
  return call<VendorPaymentAccountSummary | null>("/vendor-store/me/payment-account", "GET");
}

export function onboardMyPaymentAccount(body: OnboardPaymentAccountInput) {
  return call<VendorPaymentAccountSummary>("/vendor-store/me/payment-account/connect", "POST", body);
}

export function getKycOnboardingLink() {
  return call<{ shortUrl: string }>("/vendor-store/me/payment-account/kyc-link", "POST");
}

export function syncMyPaymentAccount() {
  return call<VendorPaymentAccountSummary>("/vendor-store/me/payment-account/sync", "POST");
}

export function getMyPaymentSummary() {
  return call<VendorPaymentMetrics>("/vendor-store/me/payment-summary", "GET");
}

export function refundStoreOrder(orderId: string, body: RefundStoreOrderInput) {
  return call<{
    refundId: string;
    orderId: string;
    amount: number;
    isFullyRefunded: boolean;
    paymentStatus: string;
  }>(`/vendor-store/me/orders/${orderId}/refund`, "POST", body);
}

// ---------------------------------------------------------------------------
// Public Storefront Payment Actions
// ---------------------------------------------------------------------------

export function verifyStoreOrderPayment(
  slug: string,
  orderId: string,
  body: VerifyStorePaymentInput,
) {
  return call<{
    orderNumber: string;
    paymentStatus: string;
    status: string;
    alreadyVerified: boolean;
  }>(`/stores/${encodeURIComponent(slug)}/orders/${orderId}/verify-payment`, "POST", body);
}

// ---------------------------------------------------------------------------
// Admin Marketplace Payments Actions
// ---------------------------------------------------------------------------

export interface AdminStorePaymentMetrics {
  totalGmv: number;
  totalPaidOrders: number;
  totalFailedOrders: number;
  totalRefundsAmount: number;
  totalPlatformCommission: number;
  totalAccounts: number;
  activeAccountsCount: number;
  pendingAccountsCount: number;
}

export function getAdminPaymentAccounts() {
  return call<VendorPaymentAccountSummary[]>("/admin/store-payments/accounts", "GET");
}

export function getAdminStoreOrders(filters?: { status?: string; paymentStatus?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return call<VendorStoreOrder[]>(`/admin/store-payments/orders${qs}`, "GET");
}
