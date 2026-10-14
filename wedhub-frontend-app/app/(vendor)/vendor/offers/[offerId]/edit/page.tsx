import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorOffer } from "@/lib/api/vendor-offers";
import { listCategories } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { OfferForm } from "../../OfferForm";

export const metadata: Metadata = {
  title: "Edit Offer | WedHub Vendor Hub",
};

export default async function EditOfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const vendor = await requireVendorOwnership();

  let offer;
  try {
    const res = await fetchVendorOffer(offerId);
    offer = res.data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const { data: categories } = await listCategories();

  return (
    <VendorShell activeHref="/vendor/offers" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-brand-primary">
            <Link href="/vendor/offers" className="hover:underline">
              Offers
            </Link>{" "}
            / {offer.title}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-dark">Edit offer</h1>
        </div>

        <OfferForm offer={offer} categories={categories} />
      </div>
    </VendorShell>
  );
}
