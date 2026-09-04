"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upsertMyBillingProfile } from "@/lib/api/vendor-invoices-client";
import type { VendorBillingProfile } from "@/lib/api/vendor-invoices.types";
import {
  INDIAN_STATES,
  formatApiError,
  validateEmail,
  validateGstin,
  validatePan,
  validatePincode,
} from "@/lib/utils/gst";

interface BillingSettingsFormProps {
  initialProfile: VendorBillingProfile;
  vendorBusinessName: string;
}

export function BillingSettingsForm({
  initialProfile,
  vendorBusinessName,
}: BillingSettingsFormProps) {
  const router = useRouter();

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
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setSuccessMsg(null);
    setErrorMsg(null);

    // Run client-side validation
    const errs = validateAllFields();
    setFieldErrors(errs);

    if (Object.keys(errs).length > 0) {
      setErrorMsg("Please fix the validation errors highlighted below before saving.");
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
      setSuccessMsg("Billing settings saved successfully!");
      setFieldErrors({});
      router.refresh();
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(formatApiError(result.error));
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

      {successMsg && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          ✕ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business & Tax Identification */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-dark">1. Business & Tax Identification</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Legal Business Name</label>
              <input
                type="text"
                value={legalName}
                maxLength={150}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Royal Moments LLP"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Trade / Brand Name</label>
              <input
                type="text"
                value={tradeName}
                maxLength={150}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="e.g. Royal Moments Photography"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">
                GSTIN (15-digit GST Number)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setGstin(val);
                  setFieldErrors((prev) => ({ ...prev, gstin: validateGstin(val) }));
                }}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
                className={`w-full uppercase rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none focus:border-brand-primary ${
                  fieldErrors.gstin ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
                }`}
              />
              {fieldErrors.gstin ? (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.gstin}</p>
              ) : (
                <p className="mt-1 text-[11px] text-text-grey">Leave blank if not GST registered.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">
                PAN (Permanent Account Number)
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setPan(val);
                  setFieldErrors((prev) => ({ ...prev, pan: validatePan(val) }));
                }}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={`w-full uppercase rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none focus:border-brand-primary ${
                  fieldErrors.pan ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
                }`}
              />
              {fieldErrors.pan && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.pan}</p>
              )}
            </div>
          </div>
        </div>

        {/* Registered Tax Address & State */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-dark">2. Registered Tax Address & State</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-text-grey">Address Line</label>
              <input
                type="text"
                value={address}
                maxLength={300}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Suite 402, Wedding Towers, MG Road"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">City</label>
              <input
                type="text"
                value={city}
                maxLength={100}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">State & State Code</label>
              <select
                value={stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
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
              <input
                type="text"
                value={pincode}
                onChange={(e) => {
                  const val = e.target.value;
                  setPincode(val);
                  setFieldErrors((prev) => ({ ...prev, pincode: validatePincode(val) }));
                }}
                placeholder="560001"
                maxLength={6}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs font-mono outline-none focus:border-brand-primary ${
                  fieldErrors.pincode ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
                }`}
              />
              {fieldErrors.pincode && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.pincode}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Billing Phone</label>
              <input
                type="tel"
                value={phone}
                maxLength={20}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.phone}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Billing Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(val) }));
                }}
                placeholder="billing@royalmoments.com"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary ${
                  fieldErrors.email ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.email}</p>
              )}
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
              <input
                type="text"
                value={bankName}
                maxLength={100}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Account Holder Name</label>
              <input
                type="text"
                value={accountName}
                maxLength={150}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Royal Moments LLP"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                maxLength={50}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="50200012345678"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-mono outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-grey">IFSC Code</label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                maxLength={20}
                className="w-full uppercase rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-mono outline-none focus:border-brand-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-text-grey">UPI ID / VPA</label>
              <input
                type="text"
                value={upiId}
                maxLength={100}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="royalmoments@okhdfcbank"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-brand-primary"
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
              <input
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
                placeholder="INV"
                maxLength={10}
                className={`w-32 uppercase rounded-lg border px-3.5 py-2.5 text-xs font-mono font-bold outline-none focus:border-brand-primary ${
                  fieldErrors.invoicePrefix ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
                }`}
              />
              {fieldErrors.invoicePrefix ? (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.invoicePrefix}
                </p>
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
