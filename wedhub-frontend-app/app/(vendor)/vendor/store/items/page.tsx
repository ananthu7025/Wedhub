import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import {
  fetchVendorStoreItems,
  fetchVendorStoreProfile,
} from "@/lib/api/vendor-store";
import { StoreNavTabs } from "@/components/vendor-store/StoreNavTabs";
import { StoreItemsManager } from "./StoreItemsManager";
import type { VendorStoreItem } from "@/lib/api/vendor-store.types";

export const metadata: Metadata = {
  title: "Store Products & Offerings | WedHub Vendor Hub",
  description: "Manage your wedding products, pricing, packages, inventory, and catalog items.",
};

export default async function VendorStoreItemsPage() {
  const vendor = await requireVendorOwnership();

  let items: VendorStoreItem[] = [];
  let itemCount = 0;
  let orderCount = 0;

  try {
    const [profileRes, itemsRes] = await Promise.all([
      fetchVendorStoreProfile(),
      fetchVendorStoreItems(),
    ]);
    items = itemsRes.data ?? [];
    itemCount = profileRes.data?.itemCount ?? items.length;
    orderCount = profileRes.data?.orderCount ?? 0;
  } catch {
    items = [];
  }

  return (
    <VendorShell
      activeHref="/vendor/store"
      vendorName={vendor.businessName}
      vendorSlug={vendor.slug}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Store Catalog & Products</h1>
          <p className="mt-1 text-sm text-text-grey">
            List products, floral arrangements, gifts, rentals, and add-on services for your storefront.
          </p>
        </div>

        <StoreNavTabs itemCount={itemCount} orderCount={orderCount} />

        <StoreItemsManager initialItems={items} />
      </div>
    </VendorShell>
  );
}
