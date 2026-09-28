import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorCatalogCollections, fetchVendorCatalogStoreSettings } from "@/lib/api/vendor-catalog";
import { getMyEffectivePlan } from "@/lib/api/vendor-self";
import { CatalogSectionShell } from "../CatalogSectionShell";
import { CatalogStorefrontPageClient } from "./CatalogStorefrontPageClient";
import type { CatalogCollection, CatalogStoreSettings } from "@/lib/api/vendor-catalog.types";

export const metadata: Metadata = {
  title: "Storefront | WedHub Vendor Hub",
  description: "Customize your public catalog page's hero banner, categories, promo tiles, gallery, and footer.",
};

export default async function VendorCatalogStorefrontPage() {
  const vendor = await requireVendorOwnership();
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category;
  const { data: plan } = await getMyEffectivePlan().catch(() => ({ data: undefined }));
  const isEligible = Boolean(primaryCategory?.hasCatalogEnabled) && Boolean(plan?.features.catalog_access);

  let storeSettings: CatalogStoreSettings | null = null;
  let collections: CatalogCollection[] = [];

  if (isEligible) {
    const [settingsRes, collectionsRes] = await Promise.all([
      fetchVendorCatalogStoreSettings().catch(() => ({ data: undefined })),
      fetchVendorCatalogCollections().catch(() => ({ data: undefined })),
    ]);
    storeSettings = settingsRes.data ?? null;
    collections = collectionsRes.data ?? [];
  }

  return (
    <VendorShell activeHref="/vendor/catalog" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <CatalogSectionShell>
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-text-dark">Storefront</h1>
            <p className="mt-1 text-sm text-text-grey">
              Everything shown on your public catalog page — a section stays hidden until you fill it in.
            </p>
          </div>

          {!isEligible ? (
            <div className="rounded-lg border border-neutral-grey-40 bg-white p-8 text-center">
              <p className="text-sm font-bold text-text-dark">Catalog isn&apos;t available on your account yet</p>
              <p className="mt-1 text-xs text-text-grey">See the Products page for details.</p>
            </div>
          ) : (
            <CatalogStorefrontPageClient initialSettings={storeSettings} collections={collections} />
          )}
        </div>
      </CatalogSectionShell>
    </VendorShell>
  );
}
