import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyEffectivePlan } from "@/lib/api/vendor-self";
import { getLeadPrefill, getMyBillingProfile } from "@/lib/api/vendor-invoices";
import { getMyQuotation } from "@/lib/api/vendor-quotations";
import type { LeadPrefillData, VendorBillingProfile } from "@/lib/api/vendor-invoices.types";
import { InvoiceEditor, type QuotePrefillData } from "../InvoiceEditor";

export const metadata: Metadata = {
  title: "Create GST Invoice | WedHub Vendor",
  description: "Generate a new compliant statutory GST tax invoice for wedding clients.",
};

interface NewInvoicePageProps {
  searchParams: Promise<{ leadId?: string; quoteId?: string }>;
}

export default async function NewVendorInvoicePage({ searchParams }: NewInvoicePageProps) {
  const vendor = await requireVendorOwnership();
  const { leadId, quoteId } = await searchParams;

  // Direct-URL gate — the /vendor/finances nav item is hidden for a Free
  // vendor, but this route is independently reachable by URL. The backend
  // already 403s createInvoice/getLeadPrefill regardless; this avoids a
  // wasted form-fill before discovering that.
  const invoicingAccess = await getMyEffectivePlan()
    .then((r) => r.data.features.invoicing_access)
    .catch(() => false);
  if (!invoicingAccess) {
    return (
      <UpgradePrompt
        feature="Invoicing"
        description="Issue GST invoices, track payments, and manage your billing profile with a plan that includes Invoicing & Billing."
        activeHref="/vendor/finances"
        vendorName={vendor.businessName}
        vendorSlug={vendor.slug}
      />
    );
  }

  let billingProfile: VendorBillingProfile;
  try {
    const profileRes = await getMyBillingProfile();
    billingProfile = profileRes.data;
  } catch {
    billingProfile = {
      id: "",
      vendorId: vendor.id,
      legalName: vendor.businessName,
      tradeName: vendor.businessName,
      gstin: null,
      pan: null,
      address: null,
      city: null,
      state: null,
      stateCode: null,
      pincode: null,
      phone: null,
      email: null,
      bankName: null,
      accountName: null,
      accountNumber: null,
      ifscCode: null,
      upiId: null,
      invoicePrefix: "INV",
      defaultNotes: null,
      defaultTerms: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  let leadPrefill: LeadPrefillData | null = null;
  if (leadId) {
    try {
      const prefillRes = await getLeadPrefill(leadId);
      leadPrefill = prefillRes.data;
    } catch {
      leadPrefill = null;
    }
  }

  let quotePrefill: QuotePrefillData | null = null;
  if (quoteId) {
    try {
      const quoteRes = await getMyQuotation(quoteId);
      if (quoteRes?.data) {
        const q = quoteRes.data;
        quotePrefill = {
          quotationId: q.id,
          quotationNumber: q.quotationNumber,
          clientName: q.clientName,
          clientPhone: q.clientPhone,
          clientEmail: q.clientEmail,
          clientAddress: q.clientAddress,
          items: q.items.map((it) => ({
            description:
              it.name +
              (it.inclusions && it.inclusions.length > 0
                ? ` (${it.inclusions.join(", ")})`
                : ""),
            sacCode: "998311",
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "Package",
            unitPrice: Number(it.unitPrice) || 0,
            discount: Number(it.discount) || 0,
            gstRate: Number(q.taxRate) || 0,
          })),
        };
      }
    } catch (err) {
      console.error("Failed to load quotation for invoice prefill:", err);
    }
  }

  return (
    <VendorShell activeHref="/vendor/finances" vendorName={vendor.businessName}>
      <InvoiceEditor
        billingProfile={billingProfile}
        leadPrefill={leadPrefill}
        quotePrefill={quotePrefill}
      />
    </VendorShell>
  );
}
