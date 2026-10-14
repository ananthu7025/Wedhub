import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { fetchVendorOffers } from "@/lib/api/vendor-offers";
import { OffersManager } from "./OffersManager";
import type { Offer } from "@/lib/api/vendor-offers.types";

export const metadata: Metadata = {
  title: "Offers | WedHub Vendor Hub",
  description: "Create and manage discounted offers shown on the public Offer Wall.",
};

export default async function VendorOffersPage() {
  const vendor = await requireVendorOwnership();

  let offers: Offer[] = [];
  try {
    const res = await fetchVendorOffers();
    offers = res.data ?? [];
  } catch {
    offers = [];
  }

  return (
    <VendorShell activeHref="/vendor/offers" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Offers</h1>
          <p className="mt-1 text-sm text-text-grey">
            Create discounted packages that appear on the public Offer Wall. No approval needed — an offer you
            create goes live immediately.
          </p>
        </div>

        <OffersManager initialOffers={offers} />
      </div>
    </VendorShell>
  );
}
