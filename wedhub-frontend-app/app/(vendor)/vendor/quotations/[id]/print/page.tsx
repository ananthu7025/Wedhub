import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyQuotation } from "@/lib/api/vendor-quotations";
import { PrintableQuotation } from "./PrintableQuotation";

interface PrintQuotationPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintQuotationPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await getMyQuotation(id);
    return {
      title: `Print Quotation #${res.data.quotationNumber} | WedHub`,
    };
  } catch {
    return {
      title: "Print Quotation | WedHub",
    };
  }
}

export default async function PrintQuotationPage({ params }: PrintQuotationPageProps) {
  await requireVendorOwnership();
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

  return <PrintableQuotation quotation={quotation} />;
}
