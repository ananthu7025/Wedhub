import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorStoreProfile } from "@/lib/api/vendor-store";
import { StoreNavTabs } from "@/components/vendor-store/StoreNavTabs";
import { ShareStoreCard } from "./ShareStoreCard";
import { StoreProfileForm } from "./StoreProfileForm";

export const metadata: Metadata = {
  title: "Vendor Store | WedHub Vendor Hub",
  description: "Manage your branded mini-store, products, policies, and WhatsApp orders.",
};

export default async function VendorStorePage() {
  const vendor = await requireVendorOwnership();

  let profile;
  try {
    const res = await fetchVendorStoreProfile();
    profile = res.data;
  } catch {
    profile = {
      id: null,
      vendorId: vendor.id,
      storeName: vendor.businessName,
      slug: vendor.slug,
      tagline: null,
      aboutStore: null,
      isEnabled: true,
      currency: "INR",
      whatsappOrderPhone: vendor.profile?.phone ?? null,
      shippingPolicy: null,
      returnPolicy: null,
      minOrderValue: null,
      accentColor: "CRIMSON" as const,
      isEligible: true,
      itemCount: 0,
      orderCount: 0,
    };
  }

  return (
    <VendorShell activeHref="/vendor/store" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Vendor Store & Commerce</h1>
          <p className="mt-1 text-sm text-text-grey">
            Run your branded storefront on WedHub. Sell wedding products, floral setups, rental gear, and packages directly to couples.
          </p>
        </div>

        <StoreNavTabs itemCount={profile.itemCount} orderCount={profile.orderCount} />

        <ShareStoreCard
          storeSlug={profile.slug}
          storeName={profile.storeName}
          isEnabled={profile.isEnabled}
        />

        <StoreProfileForm initialProfile={profile} />
      </div>
    </VendorShell>
  );
}
