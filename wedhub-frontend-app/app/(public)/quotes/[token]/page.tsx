import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicQuotation } from "@/lib/api/vendor-quotations";
import { PublicQuotationView } from "./PublicQuotationView";

interface PublicQuotePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PublicQuotePageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const res = await getPublicQuotation(token);
    return {
      title: `${res.data.title} | ${res.data.vendorBusinessName}`,
      description: `Wedding proposal prepared for ${res.data.clientName} by ${res.data.vendorBusinessName}.`,
    };
  } catch {
    return {
      title: "Wedding Proposal | WedHub",
    };
  }
}

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
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

  return <PublicQuotationView quotation={quotation} />;
}
