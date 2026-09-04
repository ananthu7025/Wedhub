import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getLeadPrefill, getMyBillingProfile } from "@/lib/api/vendor-invoices";
import type { LeadPrefillData, VendorBillingProfile } from "@/lib/api/vendor-invoices.types";
import { InvoiceEditor } from "../InvoiceEditor";

export const metadata: Metadata = {
  title: "Create GST Invoice | WedHub Vendor",
  description: "Generate a new compliant statutory GST tax invoice for wedding clients.",
};

interface NewInvoicePageProps {
  searchParams: Promise<{ leadId?: string }>;
}

export default async function NewVendorInvoicePage({ searchParams }: NewInvoicePageProps) {
  const vendor = await requireVendorOwnership();
  const { leadId } = await searchParams;

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

  return (
    <VendorShell activeHref="/vendor/invoices" vendorName={vendor.businessName}>
      <InvoiceEditor
        billingProfile={billingProfile}
        leadPrefill={leadPrefill}
      />
    </VendorShell>
  );
}
