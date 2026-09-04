import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyBillingProfile } from "@/lib/api/vendor-invoices";
import type { VendorBillingProfile } from "@/lib/api/vendor-invoices.types";
import { BillingSettingsForm } from "./BillingSettingsForm";

export const metadata: Metadata = {
  title: "Billing & GST Settings | WedHub Vendor",
  description: "Configure your business tax IDs, legal address, bank details, and invoice numbering prefix.",
};

export default async function VendorBillingSettingsPage() {
  const vendor = await requireVendorOwnership();

  let profile: VendorBillingProfile;
  try {
    const res = await getMyBillingProfile();
    profile = res.data;
  } catch {
    profile = {
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

  return (
    <VendorShell activeHref="/vendor/invoices" vendorName={vendor.businessName}>
      <BillingSettingsForm
        initialProfile={profile}
        vendorBusinessName={vendor.businessName}
      />
    </VendorShell>
  );
}
