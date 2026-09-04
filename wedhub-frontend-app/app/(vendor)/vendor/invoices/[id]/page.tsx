import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyInvoice } from "@/lib/api/vendor-invoices";
import { InvoiceDetailView } from "./InvoiceDetailView";

export const metadata: Metadata = {
  title: "Invoice Details | WedHub Vendor",
  description: "View statutory invoice breakdown, payment transactions, and audit history.",
};

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorInvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const vendor = await requireVendorOwnership();
  const { id } = await params;

  try {
    const invoiceRes = await getMyInvoice(id);
    return (
      <VendorShell activeHref="/vendor/invoices" vendorName={vendor.businessName}>
        <InvoiceDetailView initialInvoice={invoiceRes.data} />
      </VendorShell>
    );
  } catch {
    notFound();
  }
}
