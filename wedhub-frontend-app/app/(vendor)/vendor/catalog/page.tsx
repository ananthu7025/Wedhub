import type { Metadata } from "next";
import Link from "next/link";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorCatalogItems } from "@/lib/api/vendor-catalog";
import { getMyEffectivePlan } from "@/lib/api/vendor-self";
import { CatalogItemsManager } from "./CatalogItemsManager";
import type { CatalogItem } from "@/lib/api/vendor-catalog.types";

export const metadata: Metadata = {
  title: "Catalog | WedHub Vendor Hub",
  description: "Manage individual catalog items, variants, pricing, and photos.",
};

export default async function VendorCatalogPage() {
  const vendor = await requireVendorOwnership();

  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category;
  const hasCategoryAccess = Boolean(primaryCategory?.hasCatalogEnabled);

  const { data: plan } = await getMyEffectivePlan().catch(() => ({ data: undefined }));
  const hasPlanAccess = Boolean(plan?.features.catalog_access);
  const isEligible = hasCategoryAccess && hasPlanAccess;

  let items: CatalogItem[] = [];

  if (isEligible) {
    try {
      const itemsRes = await fetchVendorCatalogItems();
      items = itemsRes.data ?? [];
    } catch {
      items = [];
    }
  }

  if (!isEligible) {
    return (
      <VendorShell activeHref="/vendor/catalog" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-dark">Catalog</h1>
            <p className="mt-1 text-sm text-text-grey">
              List individual items with pricing, variants (size, color, rental terms), photos, and availability.
            </p>
          </div>

          {!hasCategoryAccess ? (
            <div className="rounded-lg border border-neutral-grey-40 bg-white p-8 text-center">
              <p className="text-sm font-bold text-text-dark">Catalog isn&apos;t enabled for your category yet</p>
              <p className="mt-1 text-xs text-text-grey max-w-md mx-auto">
                The catalog feature is currently available for select categories (Wedding Cars &amp; Luxury Rentals,
                Bridal Wear, Groom Wear, Jewellery, Cakes &amp; Desserts). Contact support if you believe this should
                be enabled for your category.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-grey-40 bg-white p-8 text-center">
              <p className="text-sm font-bold text-text-dark">Catalog is a Premium feature</p>
              <p className="mt-1 text-xs text-text-grey max-w-md mx-auto">
                Upgrade your plan to list catalog items with pricing, variants, photos, and an availability calendar.
              </p>
              <Link
                href="/vendor/subscription"
                className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover"
              >
                View plans
              </Link>
            </div>
          )}
        </div>
      </VendorShell>
    );
  }

  return (
    <VendorShell activeHref="/vendor/catalog" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Catalog</h1>
          <p className="mt-1 text-sm text-text-grey">
            List individual items with pricing, variants (size, color, rental terms), photos, and availability.
          </p>
        </div>

        <CatalogItemsManager initialItems={items} vendorSlug={vendor.slug} />
      </div>
    </VendorShell>
  );
}
