import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyQuotations, getMyQuotationMetrics } from "@/lib/api/vendor-quotations";
import type { QuotationSummaryMetrics, VendorQuotation } from "@/lib/api/vendor-quotations.types";
import { QuotationsBoard } from "./QuotationsBoard";

export const metadata: Metadata = {
  title: "Quotations & Proposals | WedHub Vendor",
  description: "Create professional branded proposals from packages and send directly via WhatsApp or PDF.",
};

export default async function VendorQuotationsPage() {
  const vendor = await requireVendorOwnership();

  let quotations: VendorQuotation[] = [];
  let metrics: QuotationSummaryMetrics = {
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

  try {
    const [quotesRes, metricsRes] = await Promise.all([
      listMyQuotations({ limit: 100 }),
      getMyQuotationMetrics(),
    ]);
    quotations = quotesRes.data;
    metrics = metricsRes.data;
  } catch {
    quotations = [];
  }

  return (
    <VendorShell activeHref="/vendor/quotations" vendorName={vendor.businessName}>
      <QuotationsBoard initialQuotations={quotations} metrics={metrics} />
    </VendorShell>
  );
}
