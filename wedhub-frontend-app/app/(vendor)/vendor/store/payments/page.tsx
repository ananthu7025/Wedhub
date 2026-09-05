import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import {
  fetchVendorStoreProfile,
  fetchVendorPaymentAccount,
  fetchVendorPaymentSummary,
  fetchVendorStoreOrders,
} from "@/lib/api/vendor-store";
import { StoreNavTabs } from "@/components/vendor-store/StoreNavTabs";
import { PaymentsBoard } from "./PaymentsBoard";
import type {
  VendorPaymentAccountSummary,
  VendorPaymentMetrics,
  VendorStoreOrder,
} from "@/lib/api/vendor-store.types";

export const metadata: Metadata = {
  title: "Payments & Settlements | WedHub Vendor Hub",
  description: "Connect your bank account, manage direct settlements via Razorpay Route, and view online orders.",
};

export default async function VendorStorePaymentsPage() {
  const vendor = await requireVendorOwnership();

  let profile;
  let account: VendorPaymentAccountSummary | null = null;
  let metrics: VendorPaymentMetrics | null = null;
  let orders: VendorStoreOrder[] = [];

  try {
    const [profileRes, accountRes, summaryRes, ordersRes] = await Promise.all([
      fetchVendorStoreProfile().catch(() => ({ data: null })),
      fetchVendorPaymentAccount().catch(() => ({ data: null })),
      fetchVendorPaymentSummary().catch(() => ({ data: null })),
      fetchVendorStoreOrders().catch(() => ({ data: [] })),
    ]);

    profile = profileRes.data;
    account = accountRes.data ?? null;
    metrics = summaryRes.data ?? null;
    orders = ordersRes.data ?? [];
  } catch {
    // fallback gracefully
  }

  const itemCount = profile?.itemCount ?? 0;
  const orderCount = profile?.orderCount ?? orders.length;

  return (
    <VendorShell
      activeHref="/vendor/store"
      vendorName={vendor.businessName}
      vendorSlug={vendor.slug}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Store Payments & Settlements</h1>
          <p className="mt-1 text-sm text-text-grey">
            Link your bank account for 0% commission direct settlements via Razorpay Route. Track payments, view transaction logs, and issue refunds.
          </p>
        </div>

        <StoreNavTabs itemCount={itemCount} orderCount={orderCount} />

        <PaymentsBoard
          initialAccount={account}
          initialMetrics={metrics}
          initialOrders={orders}
        />
      </div>
    </VendorShell>
  );
}
