import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listAdminStorePaymentAccounts,
  listAdminStoreOrders,
  getAdminStorePaymentMetrics,
} from "@/lib/api/admin";
import { AdminStorePaymentsBoard } from "./AdminStorePaymentsBoard";
import type {
  VendorPaymentAccountSummary,
  VendorStoreOrder,
} from "@/lib/api/vendor-store.types";
import type { AdminStorePaymentMetrics } from "@/lib/api/vendor-payments-client";

export const metadata: Metadata = {
  title: "Marketplace Payments & Route Settlements | WedHub Admin",
  description: "Monitor vendor bank accounts, Razorpay Route settlements, and marketplace order payouts.",
};

export default async function AdminStorePaymentsPage() {
  await requireAdmin();

  let metrics: AdminStorePaymentMetrics | null = null;
  let accounts: VendorPaymentAccountSummary[] = [];
  let orders: VendorStoreOrder[] = [];

  try {
    const [metricsRes, accountsRes, ordersRes] = await Promise.all([
      getAdminStorePaymentMetrics().catch(() => ({ data: null })),
      listAdminStorePaymentAccounts().catch(() => ({ data: [] })),
      listAdminStoreOrders().catch(() => ({ data: [] })),
    ]);

    metrics = metricsRes.data ?? null;
    accounts = accountsRes.data ?? [];
    orders = ordersRes.data ?? [];
  } catch {
    // fallback gracefully
  }

  return (
    <AdminShell activeHref="/admin/store-payments">
      <AdminStorePaymentsBoard
        initialMetrics={metrics}
        initialAccounts={accounts}
        initialOrders={orders}
      />
    </AdminShell>
  );
}
