import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyAnalytics } from "@/lib/api/vendor-self";
import { getMyLeadAnalytics } from "@/lib/api/leads";
import { AnalyticsBoard } from "./AnalyticsBoard";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function VendorAnalyticsPage() {
  const vendor = await requireVendorOwnership();
  const [profileAnalytics, leadAnalytics] = await Promise.all([
    getMyAnalytics().then((r) => r.data),
    getMyLeadAnalytics().then((r) => r.data),
  ]);

  return (
    <VendorShell activeHref="/vendor/analytics" vendorName={vendor.businessName}>
      <AnalyticsBoard profileAnalytics={profileAnalytics} leadAnalytics={leadAnalytics} />
    </VendorShell>
  );
}
