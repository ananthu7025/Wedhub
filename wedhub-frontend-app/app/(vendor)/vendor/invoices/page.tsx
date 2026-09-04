import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyInvoices, getMyInvoiceMetrics } from "@/lib/api/vendor-invoices";
import type { InvoiceSummaryMetrics, VendorInvoice } from "@/lib/api/vendor-invoices.types";
import { InvoicesBoard } from "./InvoicesBoard";

export const metadata: Metadata = {
  title: "Invoices & Billing | WedHub Vendor",
  description: "Manage client GST invoices, record payments, and track balances.",
};

export default async function VendorInvoicesPage() {
  const vendor = await requireVendorOwnership();

  let invoices: VendorInvoice[] = [];
  let metrics: InvoiceSummaryMetrics | null = null;

  try {
    const [invoicesRes, metricsRes] = await Promise.all([
      listMyInvoices({ limit: 100 }),
      getMyInvoiceMetrics(),
    ]);
    invoices = invoicesRes.data;
    metrics = metricsRes.data;
  } catch {
    invoices = [];
    metrics = null;
  }

  return (
    <VendorShell activeHref="/vendor/invoices" vendorName={vendor.businessName}>
      <InvoicesBoard
        initialInvoices={invoices}
        initialMetrics={metrics}
      />
    </VendorShell>
  );
}
