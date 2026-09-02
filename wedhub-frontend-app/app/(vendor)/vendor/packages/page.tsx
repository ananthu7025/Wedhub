import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { PackagesManager } from "./PackagesManager";

export const metadata: Metadata = {
  title: "Packages & Pricing",
};

export default async function VendorPackagesPage() {
  const vendor = await requireVendorOwnership();

  return (
    <VendorShell activeHref="/vendor/packages" vendorName={vendor.businessName}>
      <PackagesManager initialPackages={vendor.packages} currency={vendor.profile?.currency ?? "INR"} />
    </VendorShell>
  );
}
