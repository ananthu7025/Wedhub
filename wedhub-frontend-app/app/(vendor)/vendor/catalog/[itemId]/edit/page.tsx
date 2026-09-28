import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorCatalogCollections, fetchVendorCatalogItem } from "@/lib/api/vendor-catalog";
import { getCategoryBySlug } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { CatalogItemForm } from "../../CatalogItemForm";
import type { CatalogCollection, CatalogVariantField } from "@/lib/api/vendor-catalog.types";

export const metadata: Metadata = {
  title: "Edit Catalog Item | WedHub Vendor Hub",
};

export default async function EditCatalogItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const vendor = await requireVendorOwnership();
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category;

  let item;
  try {
    const res = await fetchVendorCatalogItem(itemId);
    item = res.data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

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
            / {item.title}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-dark">Edit catalog item</h1>
        </div>

        <CatalogItemForm item={item} variantFields={variantFields} collections={collections} />
      </div>
    </VendorShell>
  );
}
