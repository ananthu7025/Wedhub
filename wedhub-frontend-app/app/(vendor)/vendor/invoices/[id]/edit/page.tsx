import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyBillingProfile, getMyInvoice } from "@/lib/api/vendor-invoices";
import type { VendorBillingProfile, VendorInvoice } from "@/lib/api/vendor-invoices.types";
import { InvoiceEditor } from "../../InvoiceEditor";

export const metadata: Metadata = {
  title: "Edit Draft Invoice | WedHub Vendor",
  description: "Modify an existing draft GST invoice.",
};

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorInvoicePage({ params }: EditInvoicePageProps) {
  const vendor = await requireVendorOwnership();
  const { id } = await params;

  let invoice: VendorInvoice;
  try {
    const invoiceRes = await getMyInvoice(id);
    invoice = invoiceRes.data;
  } catch {
    notFound();
  }

  // Immutability check: Only drafts can be edited
  if (invoice.status !== "DRAFT") {
    redirect(`/vendor/invoices/${id}`);
  }

  let billingProfile: VendorBillingProfile;
  try {
    const profileRes = await getMyBillingProfile();
    billingProfile = profileRes.data;
  } catch {
    billingProfile = {
      id: "",
      vendorId: vendor.id,
      legalName: invoice.sellerLegalName || vendor.businessName,
      tradeName: invoice.sellerBusinessName || vendor.businessName,
      gstin: invoice.sellerGstin,
      pan: invoice.sellerPan,
      address: invoice.sellerAddress,
      city: invoice.sellerCity,
      state: invoice.sellerState,
      stateCode: invoice.sellerStateCode,
      pincode: null,
      phone: invoice.sellerPhone,
      email: invoice.sellerEmail,
      bankName: invoice.bankName,
      accountName: invoice.accountName,
      accountNumber: invoice.accountNumber,
      ifscCode: invoice.ifscCode,
      upiId: invoice.upiId,
      invoicePrefix: "INV",
      defaultNotes: invoice.notes,
      defaultTerms: invoice.terms,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return (
    <VendorShell activeHref="/vendor/invoices" vendorName={vendor.businessName}>
      <InvoiceEditor
        billingProfile={billingProfile}
        initialInvoice={invoice}
      />
    </VendorShell>
  );
}
