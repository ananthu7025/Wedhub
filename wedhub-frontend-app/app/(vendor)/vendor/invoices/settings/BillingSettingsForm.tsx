"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/Toast";
import { upsertMyBillingProfile } from "@/lib/api/vendor-invoices-client";
import type { VendorBillingProfile } from "@/lib/api/vendor-invoices.types";
import {
  INDIAN_STATES,
  formatApiError,
  validateEmail,
  validateGstin,
  validateIfsc,
  validatePan,
  validatePincode,
} from "@/lib/utils/gst";

interface BillingSettingsFormProps {
  initialProfile: VendorBillingProfile;
  vendorBusinessName: string;
}

type FieldName =
  | "gstin"
  | "pan"
  | "pincode"
  | "email"
  | "phone"
  | "invoicePrefix"
  | "ifscCode";

export function BillingSettingsForm({
  initialProfile,
  vendorBusinessName,
}: BillingSettingsFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [legalName, setLegalName] = useState(initialProfile.legalName ?? vendorBusinessName);
  const [tradeName, setTradeName] = useState(initialProfile.tradeName ?? vendorBusinessName);
  const [gstin, setGstin] = useState(initialProfile.gstin ?? "");
  const [pan, setPan] = useState(initialProfile.pan ?? "");
  const [address, setAddress] = useState(initialProfile.address ?? "");
  const [city, setCity] = useState(initialProfile.city ?? "");
  const [stateCode, setStateCode] = useState(initialProfile.stateCode ?? "");
  const [pincode, setPincode] = useState(initialProfile.pincode ?? "");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [email, setEmail] = useState(initialProfile.email ?? "");

  const [bankName, setBankName] = useState(initialProfile.bankName ?? "");
  const [accountName, setAccountName] = useState(initialProfile.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(initialProfile.accountNumber ?? "");
  const [ifscCode, setIfscCode] = useState(initialProfile.ifscCode ?? "");
  const [upiId, setUpiId] = useState(initialProfile.upiId ?? "");

  const [invoicePrefix, setInvoicePrefix] = useState(initialProfile.invoicePrefix || "INV");
  const [defaultNotes, setDefaultNotes] = useState(initialProfile.defaultNotes ?? "");
  const [defaultTerms, setDefaultTerms] = useState(initialProfile.defaultTerms ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [saving, setSaving] = useState(false);

  function markTouched(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleStateChange(selectedCode: string) {
    setStateCode(selectedCode);
  }

  function validateAllFields(): Record<string, string | null> {
    const errs: Record<string, string | null> = {};

    const gstinErr = validateGstin(gstin);
    if (gstinErr) errs.gstin = gstinErr;

    const panErr = validatePan(pan);
    if (panErr) errs.pan = panErr;

    const pincodeErr = validatePincode(pincode);
    if (pincodeErr) errs.pincode = pincodeErr;

    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;

    const ifscErr = validateIfsc(ifscCode);
    if (ifscErr) errs.ifscCode = ifscErr;

    if (phone.trim() && phone.trim().length > 20) {
      errs.phone = "Phone number must be at most 20 characters";
    }

    const prefix = invoicePrefix.trim().toUpperCase();
    if (!prefix || prefix.length < 1 || prefix.length > 10) {
      errs.invoicePrefix = "Invoice prefix must be 1 to 10 characters";
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Run client-side validation
    const errs = validateAllFields();
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Reveal every field's red border/message, not just the ones already touched.
      setTouched({
        gstin: true,
        pan: true,
        pincode: true,
        email: true,
        phone: true,
        invoicePrefix: true,
        ifscCode: true,
      });
      showToast("Please fix the validation errors highlighted below before saving.", "error");
      return;
    }

    setSaving(true);

    const selectedState = INDIAN_STATES.find((s) => s.code === stateCode);

    const result = await upsertMyBillingProfile({
      legalName: legalName.trim() || null,
      tradeName: tradeName.trim() || null,
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      pan: pan.trim() ? pan.trim().toUpperCase() : null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: selectedState?.name ?? null,
      stateCode: stateCode.trim() || null,
      pincode: pincode.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      bankName: bankName.trim() || null,
      accountName: accountName.trim() || null,
      accountNumber: accountNumber.trim() || null,
      ifscCode: ifscCode.trim() ? ifscCode.trim().toUpperCase() : null,
      upiId: upiId.trim() || null,
      invoicePrefix: invoicePrefix.trim().toUpperCase() || "INV",
      defaultNotes: defaultNotes.trim() || null,
      defaultTerms: defaultTerms.trim() || null,
    });

    setSaving(false);

    if (result.success) {
      showToast("Billing settings saved successfully!", "success");
      setFieldErrors({});
      router.refresh();
    } else {
      showToast(formatApiError(result.error), "error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/vendor/invoices"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-text-grey hover:text-brand-primary"
          >
            ← Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold text-text-dark">GST & Billing Settings</h1>
          <p className="text-sm text-text-grey">
            Configure your tax details, registered address, and bank info to automatically appear on your invoices.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Business & Tax Identification */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-dark">1. Business & Tax Identification</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Legal Business Name</label>
              <Input
                type="text"
                value={legalName}
                maxLength={150}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Royal Moments LLP"
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Trade / Brand Name</label>
              <Input
                type="text"
                value={tradeName}
                maxLength={150}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="e.g. Royal Moments Photography"
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">
                GSTIN (15-digit GST Number)
              </label>
              <Input
                type="text"
                value={gstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setGstin(val);
                  setFieldErrors((prev) => ({ ...prev, gstin: validateGstin(val) }));
                }}
                onBlur={() => markTouched("gstin")}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
                invalid={touched.gstin && !!fieldErrors.gstin}
                className="rounded-lg px-3.5 py-2.5 text-xs font-mono uppercase"
              />
              {touched.gstin && fieldErrors.gstin ? (
                <FieldError message={fieldErrors.gstin} />
              ) : (
                <p className="mt-1 text-[11px] text-text-grey">Leave blank if not GST registered.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">
                PAN (Permanent Account Number)
              </label>
              <Input
                type="text"
                value={pan}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setPan(val);
                  setFieldErrors((prev) => ({ ...prev, pan: validatePan(val) }));
                }}
                onBlur={() => markTouched("pan")}
                placeholder="ABCDE1234F"
                maxLength={10}
                invalid={touched.pan && !!fieldErrors.pan}
                className="rounded-lg px-3.5 py-2.5 text-xs font-mono uppercase"
              />
              {touched.pan && <FieldError message={fieldErrors.pan} />}
            </div>
          </div>
        </div>

        {/* Registered Tax Address & State */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-dark">2. Registered Tax Address & State</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-text-grey">Address Line</label>
              <Input
                type="text"
                value={address}
                maxLength={300}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Suite 402, Wedding Towers, MG Road"
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">City</label>
              <Input
                type="text"
                value={city}
                maxLength={100}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">State & State Code</label>
              <select
                value={stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-text-grey">Required to calculate CGST vs IGST.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Pincode</label>
              <Input
                type="text"
                value={pincode}
                onChange={(e) => {
                  const val = e.target.value;
                  setPincode(val);
                  setFieldErrors((prev) => ({ ...prev, pincode: validatePincode(val) }));
                }}
                onBlur={() => markTouched("pincode")}
                placeholder="560001"
                maxLength={6}
                invalid={touched.pincode && !!fieldErrors.pincode}
                className="rounded-lg px-3.5 py-2.5 text-xs font-mono"
              />
              {touched.pincode && <FieldError message={fieldErrors.pincode} />}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Billing Phone</label>
              <Input
                type="tel"
                value={phone}
                maxLength={20}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhone(val);
                  setFieldErrors((prev) => ({
                    ...prev,
                    phone: val.trim().length > 20 ? "Phone number must be at most 20 characters" : null,
                  }));
                }}
                onBlur={() => markTouched("phone")}
                placeholder="+91 9876543210"
                invalid={touched.phone && !!fieldErrors.phone}
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
              {touched.phone && <FieldError message={fieldErrors.phone} />}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Billing Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(val) }));
                }}
                onBlur={() => markTouched("email")}
                placeholder="billing@royalmoments.com"
                invalid={touched.email && !!fieldErrors.email}
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
              {touched.email && <FieldError message={fieldErrors.email} />}
            </div>
          </div>
        </div>

        {/* Bank & UPI Details for Client Payments */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-dark">3. Bank & UPI Details for Client Payments</h2>
          <p className="mb-4 text-xs text-text-grey">
            These details will be printed on the invoice so couples know where to transfer payments.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Bank Name</label>
              <Input
                type="text"
                value={bankName}
                maxLength={100}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank"
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Account Holder Name</label>
              <Input
                type="text"
                value={accountName}
                maxLength={150}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Royal Moments LLP"
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Account Number</label>
              <Input
                type="text"
                value={accountNumber}
                maxLength={50}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="50200012345678"
                className="rounded-lg px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">IFSC Code</label>
              <Input
                type="text"
                value={ifscCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setIfscCode(val);
                  setFieldErrors((prev) => ({ ...prev, ifscCode: validateIfsc(val) }));
                }}
                onBlur={() => markTouched("ifscCode")}
                placeholder="HDFC0001234"
                maxLength={20}
                invalid={touched.ifscCode && !!fieldErrors.ifscCode}
                className="rounded-lg px-3.5 py-2.5 text-xs font-mono uppercase"
              />
              {touched.ifscCode && <FieldError message={fieldErrors.ifscCode} />}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-text-grey">UPI ID / VPA</label>
              <Input
                type="text"
                value={upiId}
                maxLength={100}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="royalmoments@okhdfcbank"
                className="rounded-lg px-3.5 py-2.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Invoice Numbering & Default Terms */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-dark">4. Numbering Prefix & Default Terms</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Invoice Prefix</label>
              <Input
                type="text"
                value={invoicePrefix}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setInvoicePrefix(val);
                  setFieldErrors((prev) => ({
                    ...prev,
                    invoicePrefix:
                      !val || val.length < 1 || val.length > 10
                        ? "Prefix must be 1 to 10 characters"
                        : null,
                  }));
                }}
                onBlur={() => markTouched("invoicePrefix")}
                placeholder="INV"
                maxLength={10}
                invalid={touched.invoicePrefix && !!fieldErrors.invoicePrefix}
                className="w-32 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold uppercase"
              />
              {touched.invoicePrefix && fieldErrors.invoicePrefix ? (
                <FieldError message={fieldErrors.invoicePrefix} />
              ) : (
                <p className="mt-1 text-[11px] text-text-grey">
                  Used to format invoice numbers (e.g. {invoicePrefix || "INV"}-2026-0001).
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Default Notes</label>
              <textarea
                value={defaultNotes}
                maxLength={1000}
                onChange={(e) => setDefaultNotes(e.target.value)}
                rows={2}
                placeholder="Thank you for trusting us with your celebration!"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Default Terms & Conditions</label>
              <textarea
                value={defaultTerms}
                maxLength={2000}
                onChange={(e) => setDefaultTerms(e.target.value)}
                rows={3}
                placeholder="1. 50% advance to confirm booking.\n2. Balance on event date."
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/vendor/invoices"
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-semibold text-text-dark hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-primary px-6 py-2.5 text-xs font-bold text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving Settings…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
