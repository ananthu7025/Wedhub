import type { Metadata } from "next";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { VendorClaimFlow } from "./VendorClaimFlow";

export const metadata: Metadata = {
  title: "Claim your vendor profile",
  robots: { index: false, follow: false },
};

// Path param, not a query string (?token=), because the invitation link the
// backend generates is /vendor-claim/<token> — see wedhub-backend's
// vendor-admin.service.ts::createInvitation. The token itself never expires
// (VendorInvitation.expiresAt is null for invitations created by this flow)
// — see PLAN-2026-09-30-vendor-bulk-import-claim-flow.md for why that's
// only safe alongside the OTP step VendorClaimFlow drives the vendor through.
export default async function VendorClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <BrandLogo variant="dark" />
        </div>
        <VendorClaimFlow token={token} />
      </div>
    </div>
  );
}
