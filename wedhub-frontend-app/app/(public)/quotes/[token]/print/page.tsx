import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicQuotation } from "@/lib/api/vendor-quotations";
import { PrintableQuotation } from "@/app/(vendor)/vendor/quotations/[id]/print/PrintableQuotation";

interface PublicPrintQuotationPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PublicPrintQuotationPageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const res = await getPublicQuotation(token);
    return {
      title: `Print Proposal #${res.data.quotationNumber} | ${res.data.vendorBusinessName}`,
    };
  } catch {
    return {
      title: "Print Proposal | WedHub",
    };
  }
}

export default async function PublicPrintQuotationPage({ params }: PublicPrintQuotationPageProps) {
  const { token } = await params;

  let quotation = null;
  try {
    const res = await getPublicQuotation(token);
    quotation = res.data;
  } catch {
    notFound();
  }

  if (!quotation) {
    notFound();
  }

  return <PrintableQuotation quotation={quotation} />;
}
