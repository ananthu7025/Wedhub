import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyMedia } from "@/lib/api/vendor-self";
import { PortfolioManager } from "./PortfolioManager";

export const metadata: Metadata = {
  title: "Portfolio",
};

export default async function VendorPortfolioPage() {
  const vendor = await requireVendorOwnership();
  const { data: media } = await listMyMedia();

  return (
    <VendorShell activeHref="/vendor/portfolio" vendorName={vendor.businessName}>
      <PortfolioManager
        initialMedia={media}
        currentLogoMediaId={vendor.profile?.logoMediaId ?? null}
        currentCoverMediaId={vendor.profile?.coverMediaId ?? null}
      />
    </VendorShell>
  );
}
