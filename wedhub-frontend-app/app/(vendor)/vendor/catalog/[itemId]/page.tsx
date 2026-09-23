import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorCatalogItem, fetchVendorCatalogItemAvailability } from "@/lib/api/vendor-catalog";
import { ApiRequestError } from "@/lib/api/types";
import { CatalogItemAvailabilityBoard } from "./CatalogItemAvailabilityBoard";

export const metadata: Metadata = {
  title: "Item Availability | WedHub Vendor Hub",
  description: "Manage which dates this catalog item is booked or blocked.",
};

export default async function CatalogItemAvailabilityPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const vendor = await requireVendorOwnership();

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

  const availabilityRes = await fetchVendorCatalogItemAvailability(itemId).catch(() => ({ data: [] }));

  return (
    <VendorShell activeHref="/vendor/catalog" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-brand-primary">
            <Link href="/vendor/catalog" className="hover:underline">
              Catalog
            </Link>{" "}
            / {item.title}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-dark">Availability — {item.title}</h1>
          <p className="mt-1 text-sm text-text-grey">
            Click a date to mark it booked or blocked. Dates without a mark are shown as available.
          </p>
        </div>

        <CatalogItemAvailabilityBoard item={item} initialAvailability={availabilityRes.data} />
      </div>
    </VendorShell>
  );
}
