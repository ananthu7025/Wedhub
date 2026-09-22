import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyEffectivePlan } from "@/lib/api/vendor-self";
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

  // Direct-URL gate — see /vendor/invoices/new's identical gate for why.
  const invoicingAccess = await getMyEffectivePlan()
    .then((r) => r.data.features.invoicing_access)
    .catch(() => false);
  if (!invoicingAccess) {
    return (
      <UpgradePrompt
        feature="Quotations"
        description="Create branded wedding proposals from your packages and send them to couples for acceptance."
        activeHref="/vendor/finances"
        vendorName={vendor.businessName}
        vendorSlug={vendor.slug}
      />
    );
  }

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
