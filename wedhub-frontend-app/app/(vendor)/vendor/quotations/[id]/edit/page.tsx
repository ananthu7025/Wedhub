import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyQuotation } from "@/lib/api/vendor-quotations";
import { QuotationEditor } from "../../QuotationEditor";

export const metadata: Metadata = {
  title: "Edit Quotation | WedHub Vendor",
  description: "Edit quotation details, packages, deliverables and pricing.",
};

interface EditQuotationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuotationPage({ params }: EditQuotationPageProps) {
  const vendor = await requireVendorOwnership();
  const { id } = await params;

  let quotation = null;
  try {
    const res = await getMyQuotation(id);
    quotation = res.data;
  } catch {
    notFound();
  }

  if (!quotation) {
    notFound();
  }

  return (
    <VendorShell activeHref="/vendor/quotations" vendorName={vendor.businessName}>
      <QuotationEditor
        initialQuotation={quotation}
        availablePackages={vendor.packages}
        vendorCurrency={quotation.currency || vendor.profile?.currency || "INR"}
        vendorBusinessName={vendor.businessName}
      />
    </VendorShell>
  );
}
