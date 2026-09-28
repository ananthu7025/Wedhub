import type { Metadata } from "next";
import Link from "next/link";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorCatalogCollections } from "@/lib/api/vendor-catalog";
import { getCategoryBySlug } from "@/lib/api/catalog";
import { CatalogItemForm } from "../CatalogItemForm";
import type { CatalogCollection, CatalogVariantField } from "@/lib/api/vendor-catalog.types";

export const metadata: Metadata = {
  title: "New Catalog Item | WedHub Vendor Hub",
};

export default async function NewCatalogItemPage() {
  const vendor = await requireVendorOwnership();
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category;

  let variantFields: CatalogVariantField[] = [];
  let collections: CatalogCollection[] = [];

  if (primaryCategory) {
    const [categoryRes, collectionsRes] = await Promise.all([
      getCategoryBySlug(primaryCategory.slug),
      fetchVendorCatalogCollections().catch(() => ({ data: undefined })),
    ]);
    variantFields = categoryRes.data?.catalogVariantFields ?? [];
    collections = collectionsRes.data ?? [];
  }

  return (
    <VendorShell activeHref="/vendor/catalog" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-brand-primary">
            <Link href="/vendor/catalog" className="hover:underline">
              Catalog
            </Link>{" "}
            / New item
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-dark">Add catalog item</h1>
        </div>

        <CatalogItemForm variantFields={variantFields} collections={collections} />
      </div>
    </VendorShell>
  );
}
