import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyLeads, listMyProfileViewers } from "@/lib/api/leads";
import { LeadsBoard } from "./LeadsBoard";

export const metadata: Metadata = {
  title: "Leads",
};

export default async function VendorLeadsPage() {
  const vendor = await requireVendorOwnership();
  const [{ data: leads }, { data: profileViewers }] = await Promise.all([
    listMyLeads({ limit: 100 }),
    listMyProfileViewers({ limit: 10 }),
  ]);

  return (
    <VendorShell activeHref="/vendor/leads" vendorName={vendor.businessName}>
      <LeadsBoard initialLeads={leads} profileViewers={profileViewers} />
    </VendorShell>
  );
}
