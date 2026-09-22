import { Suspense } from "react";
import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyEffectivePlan } from "@/lib/api/vendor-self";
import { listMyQuotations, getMyQuotationMetrics } from "@/lib/api/vendor-quotations";
import { listMyInvoices, getMyInvoiceMetrics } from "@/lib/api/vendor-invoices";
import type { QuotationSummaryMetrics, VendorQuotation } from "@/lib/api/vendor-quotations.types";
import type { InvoiceSummaryMetrics, VendorInvoice } from "@/lib/api/vendor-invoices.types";
import { FinancesHub } from "./FinancesHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quotes & Invoices | WedHub Vendor",
  description: "Manage prospective client proposals, couple acceptances, GST invoices, and payment tracking.",
};

interface FinancesPageProps {
  searchParams: Promise<{ tab?: "quotes" | "invoices" }>;
}

export default async function FinancesPage({ searchParams }: FinancesPageProps) {
  const vendor = await requireVendorOwnership();
  const params = await searchParams;
  const initialTab = params.tab === "invoices" ? "invoices" : "quotes";

  const invoicingAccess = await getMyEffectivePlan()
    .then((r) => r.data.features.invoicing_access)
    .catch(() => false);

  let quotations: VendorQuotation[] = [];
  let quotationMetrics: QuotationSummaryMetrics = {
    totalCount: 0,
    draftCount: 0,
    sentCount: 0,
    acceptedCount: 0,
    declinedCount: 0,
    expiredCount: 0,
    totalQuotedValue: 0,
    totalAcceptedValue: 0,
    conversionRate: 0,
  };

  let invoices: VendorInvoice[] = [];
  let invoiceMetrics: InvoiceSummaryMetrics | null = null;

  try {
    const [quotesRes, quoteMetricsRes, invoicesRes, invMetricsRes] = await Promise.all([
      listMyQuotations({ limit: 100 }).catch((err) => {
        console.error("Failed to fetch quotations:", err);
        return { data: [] as VendorQuotation[] };
      }),
      getMyQuotationMetrics().catch((err) => {
        console.error("Failed to fetch quotation metrics:", err);
        return { data: quotationMetrics };
      }),
      listMyInvoices({ limit: 100 }).catch((err) => {
        console.error("Failed to fetch invoices:", err);
        return { data: [] as VendorInvoice[] };
      }),
      getMyInvoiceMetrics().catch((err) => {
        console.error("Failed to fetch invoice metrics:", err);
        return { data: null };
      }),
    ]);

    quotations = quotesRes.data ?? [];
    quotationMetrics = quoteMetricsRes.data ?? quotationMetrics;
    invoices = invoicesRes.data ?? [];
    invoiceMetrics = invMetricsRes.data ?? null;
  } catch (err) {
    console.error("Error loading finances page:", err);
  }

  return (
    <VendorShell activeHref="/vendor/finances" vendorName={vendor.businessName}>
      <Suspense fallback={<div className="p-8 text-sm text-neutral-500">Loading quotes & invoices...</div>}>
        <FinancesHub
          initialQuotations={quotations}
          quotationMetrics={quotationMetrics}
          initialInvoices={invoices}
          invoiceMetrics={invoiceMetrics}
          initialTab={initialTab}
          invoicingAccess={invoicingAccess}
        />
      </Suspense>
    </VendorShell>
  );
}
