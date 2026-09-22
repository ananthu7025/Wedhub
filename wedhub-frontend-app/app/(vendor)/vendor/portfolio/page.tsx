import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyMedia } from "@/lib/api/vendor-self";
import { PortfolioManager } from "./PortfolioManager";
import { ProfileMediaPrompt } from "./ProfileMediaPrompt";

export const metadata: Metadata = {
  title: "Portfolio",
};

export default async function VendorPortfolioPage() {
  const vendor = await requireVendorOwnership();
  const { data: media } = await listMyMedia();
  const logoMedia = vendor.profile?.logoMedia;
  const coverMedia = vendor.profile?.coverMedia;

  return (
    <VendorShell activeHref="/vendor/portfolio" vendorName={vendor.businessName}>
      <ProfileMediaPrompt
        logoMediaId={vendor.profile?.logoMediaId ?? null}
        logoObjectKey={logoMedia?.optimizedObjectKey ?? logoMedia?.originalObjectKey ?? null}
        coverMediaId={vendor.profile?.coverMediaId ?? null}
        coverObjectKey={coverMedia?.optimizedObjectKey ?? coverMedia?.originalObjectKey ?? null}
      />
      <PortfolioManager
        initialMedia={media}
        currentLogoMediaId={vendor.profile?.logoMediaId ?? null}
        currentCoverMediaId={vendor.profile?.coverMediaId ?? null}
      />
    </VendorShell>
  );
}
