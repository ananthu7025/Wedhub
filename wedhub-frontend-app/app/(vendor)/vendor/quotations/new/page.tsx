import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getLeadQuotationPrefill } from "@/lib/api/vendor-quotations";
import type { LeadQuotationPrefill } from "@/lib/api/vendor-quotations.types";
import { QuotationEditor } from "../QuotationEditor";

export const metadata: Metadata = {
  title: "New Quotation | WedHub Vendor",
  description: "Create a branded quotation from existing packages.",
};

interface NewQuotationPageProps {
  searchParams: Promise<{ leadId?: string }>;
}

export default async function NewQuotationPage({ searchParams }: NewQuotationPageProps) {
  const vendor = await requireVendorOwnership();
  const { leadId } = await searchParams;

  let leadPrefill: LeadQuotationPrefill | null = null;
  if (leadId) {
    try {
      const res = await getLeadQuotationPrefill(leadId);
      leadPrefill = res.data;
    } catch {
      leadPrefill = null;
    }
  }

  return (
    <VendorShell activeHref="/vendor/finances" vendorName={vendor.businessName}>
      <QuotationEditor
        availablePackages={vendor.packages}
        leadPrefill={leadPrefill}
        vendorCurrency={vendor.profile?.currency ?? "INR"}
        vendorBusinessName={vendor.businessName}
      />
    </VendorShell>
  );
}
