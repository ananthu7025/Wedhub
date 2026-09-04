import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyInvoice } from "@/lib/api/vendor-invoices";
import { PrintableInvoice } from "./PrintableInvoice";

interface PrintInvoicePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintInvoicePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const invoiceRes = await getMyInvoice(id);
    return {
      title: `Tax Invoice - ${invoiceRes.data.invoiceNumber} | ${invoiceRes.data.sellerBusinessName}`,
    };
  } catch {
    return { title: "Invoice Print Preview" };
  }
}

export default async function PrintInvoicePage({ params }: PrintInvoicePageProps) {
  await requireVendorOwnership();
  const { id } = await params;

  try {
    const invoiceRes = await getMyInvoice(id);
    return <PrintableInvoice invoice={invoiceRes.data} />;
  } catch {
    notFound();
  }
}
