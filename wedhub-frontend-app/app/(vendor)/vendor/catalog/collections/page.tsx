import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorCatalogCollections } from "@/lib/api/vendor-catalog";
import { getMyEffectivePlan } from "@/lib/api/vendor-self";
import { CatalogSectionShell } from "../CatalogSectionShell";
import { CatalogCollectionsPageClient } from "./CatalogCollectionsPageClient";

export const metadata: Metadata = {
  title: "Collections | WedHub Vendor Hub",
  description: "Group catalog items into named collections shown on your public storefront.",
};

export default async function VendorCatalogCollectionsPage() {
  const vendor = await requireVendorOwnership();
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category;
  const { data: plan } = await getMyEffectivePlan().catch(() => ({ data: undefined }));
  const isEligible = Boolean(primaryCategory?.hasCatalogEnabled) && Boolean(plan?.features.catalog_access);

  const collectionsRes = isEligible ? await fetchVendorCatalogCollections().catch(() => ({ data: [] })) : { data: [] };

  return (
    <VendorShell activeHref="/vendor/catalog" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <CatalogSectionShell>
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-text-dark">Collections</h1>
            <p className="mt-1 text-sm text-text-grey">
              Group items into named collections (e.g. Best Sellers, Festive Edit) to control what shows in your
              storefront&apos;s category grid and tab filters.
            </p>
          </div>

          {!isEligible ? (
            <div className="rounded-lg border border-neutral-grey-40 bg-white p-8 text-center">
              <p className="text-sm font-bold text-text-dark">Catalog isn&apos;t available on your account yet</p>
              <p className="mt-1 text-xs text-text-grey">See the Products page for details.</p>
            </div>
          ) : (
            <CatalogCollectionsPageClient initialCollections={collectionsRes.data ?? []} />
          )}
        </div>
      </CatalogSectionShell>
    </VendorShell>
  );
}
