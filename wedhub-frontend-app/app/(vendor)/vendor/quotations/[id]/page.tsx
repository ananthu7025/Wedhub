import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyQuotation } from "@/lib/api/vendor-quotations";
import { QuotationDetailView } from "./QuotationDetailView";

interface QuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: QuotationDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await getMyQuotation(id);
    return {
      title: `Quotation #${res.data.quotationNumber} | WedHub Vendor`,
    };
  } catch {
    return {
      title: "Quotation Details | WedHub Vendor",
    };
  }
}

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
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
      <QuotationDetailView quotation={quotation} />
    </VendorShell>
  );
}
