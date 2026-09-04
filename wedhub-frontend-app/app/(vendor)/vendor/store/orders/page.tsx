import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import {
  fetchVendorStoreOrders,
  fetchVendorStoreProfile,
} from "@/lib/api/vendor-store";
import { StoreNavTabs } from "@/components/vendor-store/StoreNavTabs";
import { StoreOrdersTable } from "./StoreOrdersTable";
import type { VendorStoreOrder } from "@/lib/api/vendor-store.types";

export const metadata: Metadata = {
  title: "Store Orders & Inquiries | WedHub Vendor Hub",
  description: "View and manage incoming customer orders, customer contact details, and create GST invoices.",
};

export default async function VendorStoreOrdersPage() {
  const vendor = await requireVendorOwnership();

  let orders: VendorStoreOrder[] = [];
  let itemCount = 0;
  let orderCount = 0;

  try {
    const [profileRes, ordersRes] = await Promise.all([
      fetchVendorStoreProfile(),
      fetchVendorStoreOrders(),
    ]);
    orders = ordersRes.data ?? [];
    itemCount = profileRes.data?.itemCount ?? 0;
    orderCount = profileRes.data?.orderCount ?? orders.length;
  } catch {
    orders = [];
  }

  return (
    <VendorShell
      activeHref="/vendor/store"
      vendorName={vendor.businessName}
      vendorSlug={vendor.slug}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Store Orders & Inquiries</h1>
          <p className="mt-1 text-sm text-text-grey">
            Track incoming customer orders, message couples on WhatsApp, and generate 1-click GST invoices for billing.
          </p>
        </div>

        <StoreNavTabs itemCount={itemCount} orderCount={orderCount} />

        <StoreOrdersTable initialOrders={orders} />
      </div>
    </VendorShell>
  );
}
