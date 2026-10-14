import type { Metadata } from "next";
import Link from "next/link";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listCategories } from "@/lib/api/catalog";
import { OfferForm } from "../OfferForm";

export const metadata: Metadata = {
  title: "New Offer | WedHub Vendor Hub",
};

export default async function NewOfferPage() {
  const vendor = await requireVendorOwnership();
  const { data: categories } = await listCategories();

  return (
    <VendorShell activeHref="/vendor/offers" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-brand-primary">
            <Link href="/vendor/offers" className="hover:underline">
              Offers
            </Link>{" "}
            / New offer
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-dark">Create offer</h1>
        </div>

        <OfferForm categories={categories} />
      </div>
    </VendorShell>
  );
}
