"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  InvoiceItemInput,
  LeadPrefillData,
  VendorBillingProfile,
  VendorInvoice,
} from "@/lib/api/vendor-invoices.types";
import {
  createMyInvoice,
  issueMyInvoice,
  updateMyInvoice,
} from "@/lib/api/vendor-invoices-client";
import {
  INDIAN_STATES,
  SAC_PRESETS,
  formatApiError,
  validateEmail,
  validateGstin,
} from "@/lib/utils/gst";

interface InvoiceEditorProps {
  billingProfile: VendorBillingProfile;
  initialInvoice?: VendorInvoice | null;
  leadPrefill?: LeadPrefillData | null;
}

interface EditorLineItem {
  key: string;
  id?: string;
  description: string;
  sacCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  gstRate: number;
}

export function InvoiceEditor({
  billingProfile,
  initialInvoice,
  leadPrefill,
}: InvoiceEditorProps) {
  const router = useRouter();
  const isEditing = !!initialInvoice;

  // Invoice Dates
  const todayStr = new Date().toISOString().split("T")[0];
  const [issueDate, setIssueDate] = useState(
    initialInvoice?.issueDate
      ? initialInvoice.issueDate.split("T")[0]
      : todayStr
  );
  const [dueDate, setDueDate] = useState(
    initialInvoice?.dueDate
      ? initialInvoice.dueDate.split("T")[0]
      : ""
  );

  // Client Details
  const [clientName, setClientName] = useState(
    initialInvoice?.clientName ?? leadPrefill?.clientName ?? ""
  );
  const [clientPhone, setClientPhone] = useState(
    initialInvoice?.clientPhone ?? leadPrefill?.clientPhone ?? ""
  );
  const [clientEmail, setClientEmail] = useState(
    initialInvoice?.clientEmail ?? leadPrefill?.clientEmail ?? ""
  );
  const [clientAddress, setClientAddress] = useState(
    initialInvoice?.clientAddress ?? ""
  );
  const [clientCity, setClientCity] = useState(
    initialInvoice?.clientCity ?? ""
  );
  const [clientStateCode, setClientStateCode] = useState(
    initialInvoice?.clientStateCode ?? billingProfile.stateCode ?? ""
  );
  const [clientGstin, setClientGstin] = useState(
    initialInvoice?.clientGstin ?? ""
  );

  // Selected State object
  const clientStateObj = INDIAN_STATES.find((s) => s.code === clientStateCode);
  const sellerStateCode = billingProfile.stateCode || "";

  // Place of Supply
  const [placeOfSupply, setPlaceOfSupply] = useState(
    initialInvoice?.placeOfSupply ??
      (clientStateObj ? `${clientStateCode} - ${clientStateObj.name}` : "")
  );

  // Line items
  const initialItems: EditorLineItem[] =
    initialInvoice?.items && initialInvoice.items.length > 0
      ? initialInvoice.items.map((it, idx) => ({
          key: `item-${idx}-${Date.now()}`,
          id: it.id,
          description: it.description,
          sacCode: it.sacCode ?? "",
          quantity: it.quantity,
          unit: it.unit || "unit",
          unitPrice: it.unitPrice,
          discount: it.discount,
          gstRate: it.gstRate,
        }))
      : [
          {
            key: `item-0-${Date.now()}`,
            description: leadPrefill?.eventDate
              ? `Wedding Services for ${clientName || "Couple"} (${new Date(
                  leadPrefill.eventDate
                ).toLocaleDateString("en-IN")})`
              : "Wedding Services",
            sacCode: "998311",
            quantity: 1,
            unit: "service",
            unitPrice: leadPrefill?.budget ?? 50000,
            discount: 0,
            gstRate: 18,
          },
        ];

  const [items, setItems] = useState<EditorLineItem[]>(initialItems);

  // Bank & Payment Snapshot
  const [bankName, setBankName] = useState(
    initialInvoice?.bankName ?? billingProfile.bankName ?? ""
  );
  const [accountName, setAccountName] = useState(
    initialInvoice?.accountName ?? billingProfile.accountName ?? ""
  );
  const [accountNumber, setAccountNumber] = useState(
    initialInvoice?.accountNumber ?? billingProfile.accountNumber ?? ""
  );
  const [ifscCode, setIfscCode] = useState(
    initialInvoice?.ifscCode ?? billingProfile.ifscCode ?? ""
  );
  const [upiId, setUpiId] = useState(
    initialInvoice?.upiId ?? billingProfile.upiId ?? ""
  );

  // Notes & Terms
  const [notes, setNotes] = useState(
    initialInvoice?.notes ??
      billingProfile.defaultNotes ??
      "Thank you for choosing us for your special day!"
  );
  const [terms, setTerms] = useState(
    initialInvoice?.terms ??
      billingProfile.defaultTerms ??
      "1. Full payment must be settled before completion of delivery.\n2. In case of rescheduling, notify at least 30 days prior."
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Change handler
  function handleClientStateChange(code: string) {
    setClientStateCode(code);
    const found = INDIAN_STATES.find((s) => s.code === code);
    if (found) {
      setPlaceOfSupply(`${code} - ${found.name}`);
    }
  }

  // Line item handlers
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: `item-${prev.length}-${Date.now()}`,
        description: "",
        sacCode: "998311",
        quantity: 1,
        unit: "unit",
        unitPrice: 0,
        discount: 0,
        gstRate: 18,
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateItem(index: number, patch: Partial<EditorLineItem>) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  }

  // Real-time tax calculation
  const isInterState =
    Boolean(sellerStateCode && clientStateCode) &&
    sellerStateCode !== clientStateCode;

  let computedSubtotal = 0;
  let computedDiscount = 0;
  let computedTaxable = 0;
  let computedTotalTax = 0;
  let computedCgst = 0;
  let computedSgst = 0;
  let computedIgst = 0;

  for (const item of items) {
    const gross = (item.quantity || 0) * (item.unitPrice || 0);
    const disc = Math.min(gross, item.discount || 0);
    const taxable = Math.max(0, gross - disc);
    const rate = item.gstRate || 0;
    const tax = Math.round(((taxable * rate) / 100) * 100) / 100;

    computedSubtotal += gross;
    computedDiscount += disc;
    computedTaxable += taxable;
    computedTotalTax += tax;

    if (isInterState) {
      computedIgst += tax;
    } else {
      computedCgst += Math.round((tax / 2) * 100) / 100;
      computedSgst += Math.round((tax / 2) * 100) / 100;
    }
  }

  const rawGrandTotal = computedTaxable + computedTotalTax;
  const computedGrandTotal = Math.round(rawGrandTotal);
  const computedRoundOff =
    Math.round((computedGrandTotal - rawGrandTotal) * 100) / 100;

  function formatINR(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  async function handleSave(issueImmediately: boolean) {
    setErrorMsg(null);

    // 1. Client Details Validation
    if (!clientName.trim()) {
      setErrorMsg("Client name is required.");
      return;
    }
    if (clientName.trim().length > 150) {
      setErrorMsg("Client name cannot exceed 150 characters.");
      return;
    }
    if (clientPhone.trim() && clientPhone.trim().length > 25) {
      setErrorMsg("Client phone number cannot exceed 25 characters.");
      return;
    }
    const emailErr = validateEmail(clientEmail);
    if (emailErr) {
      setErrorMsg(`Client email error: ${emailErr}`);
      return;
    }
    const gstinErr = validateGstin(clientGstin);
    if (gstinErr) {
      setErrorMsg(`Client GSTIN error: ${gstinErr}`);
      return;
    }
    if (!placeOfSupply.trim()) {
      setErrorMsg("Place of supply is required.");
      return;
    }

    // 2. Dates Validation
    const cleanIssueDate = issueDate.trim().split("T")[0];
    if (!cleanIssueDate) {
      setErrorMsg("Issue date is required.");
      return;
    }
    const cleanDueDate = dueDate.trim() ? dueDate.trim().split("T")[0] : null;
    if (cleanDueDate && cleanDueDate < cleanIssueDate) {
      setErrorMsg(`Due date (${cleanDueDate}) cannot be earlier than issue date (${cleanIssueDate}).`);
      return;
    }

    // 3. Line Items Validation
    if (items.length === 0) {
      setErrorMsg("Please add at least one line item.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const lineNum = i + 1;
      if (!it.description.trim()) {
        setErrorMsg(`Item #${lineNum}: Description is required.`);
        return;
      }
      if (it.description.trim().length > 300) {
        setErrorMsg(`Item #${lineNum}: Description cannot exceed 300 characters.`);
        return;
      }
      const qty = Number(it.quantity);
      if (isNaN(qty) || qty <= 0) {
        setErrorMsg(`Item #${lineNum}: Quantity must be greater than 0.`);
        return;
      }
      const price = Number(it.unitPrice);
      if (isNaN(price) || price < 0) {
        setErrorMsg(`Item #${lineNum}: Unit price cannot be negative.`);
        return;
      }
      const disc = Number(it.discount || 0);
      if (isNaN(disc) || disc < 0) {
        setErrorMsg(`Item #${lineNum}: Discount cannot be negative.`);
        return;
      }
      const gross = qty * price;
      if (disc > gross) {
        setErrorMsg(
          `Item #${lineNum} ("${it.description.trim()}"): Discount (₹${disc}) cannot exceed gross amount (₹${gross}).`,
        );
        return;
      }
    }

    setSaving(true);

    const payloadItems: InvoiceItemInput[] = items.map((it) => ({
      description: it.description.trim() || "Service",
      sacCode: it.sacCode.trim() || null,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit: it.unit.trim() || "unit",
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      discount: Math.max(0, Number(it.discount) || 0),
      gstRate: Number(it.gstRate) || 0,
    }));

    try {
      if (isEditing && initialInvoice) {
        // Update draft
        const updateRes = await updateMyInvoice(initialInvoice.id, {
          issueDate: cleanIssueDate,
          dueDate: cleanDueDate,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || null,
          clientEmail: clientEmail.trim() || null,
          clientAddress: clientAddress.trim() || null,
          clientCity: clientCity.trim() || null,
          clientState: clientStateObj?.name ?? null,
          clientStateCode: clientStateCode.trim() || null,
          clientGstin: clientGstin.trim() ? clientGstin.trim().toUpperCase() : null,
          placeOfSupply: placeOfSupply.trim(),
          items: payloadItems,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          bankName: bankName.trim() || null,
          accountName: accountName.trim() || null,
          accountNumber: accountNumber.trim() || null,
          ifscCode: ifscCode.trim() ? ifscCode.trim().toUpperCase() : null,
          upiId: upiId.trim() || null,
        });

        if (!updateRes.success) {
          setErrorMsg(formatApiError(updateRes.error));
          setSaving(false);
          return;
        }

        if (issueImmediately) {
          const issueRes = await issueMyInvoice(initialInvoice.id);
          if (!issueRes.success) {
            setErrorMsg(formatApiError(issueRes.error));
            setSaving(false);
            return;
          }
        }

        router.push(`/vendor/invoices/${initialInvoice.id}`);
        router.refresh();
      } else {
        // Create new
        const createRes = await createMyInvoice({
          leadId: leadPrefill?.leadId ?? null,
          issueDate: cleanIssueDate,
          dueDate: cleanDueDate,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || null,
          clientEmail: clientEmail.trim() || null,
          clientAddress: clientAddress.trim() || null,
          clientCity: clientCity.trim() || null,
          clientState: clientStateObj?.name ?? null,
          clientStateCode: clientStateCode.trim() || null,
          clientGstin: clientGstin.trim() ? clientGstin.trim().toUpperCase() : null,
          placeOfSupply: placeOfSupply.trim(),
          items: payloadItems,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          bankName: bankName.trim() || null,
          accountName: accountName.trim() || null,
          accountNumber: accountNumber.trim() || null,
          ifscCode: ifscCode.trim() ? ifscCode.trim().toUpperCase() : null,
          upiId: upiId.trim() || null,
        });

        if (!createRes.success) {
          setErrorMsg(formatApiError(createRes.error));
          setSaving(false);
          return;
        }

        const newId = createRes.data.id;

        if (issueImmediately) {
          const issueRes = await issueMyInvoice(newId);
          if (!issueRes.success) {
            setErrorMsg(formatApiError(issueRes.error));
            setSaving(false);
            return;
          }
        }

        router.push(`/vendor/invoices/${newId}`);
        router.refresh();
      }
    } catch {
      setErrorMsg("An unexpected network error occurred while saving the invoice.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/vendor/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-grey hover:text-brand-primary"
          >
            ← Back to Invoices
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-dark">
            {isEditing ? `Edit Draft #${initialInvoice.invoiceNumber}` : "New GST Invoice"}
          </h1>
          <p className="text-xs text-text-grey">
            {isEditing
              ? "Make changes to your draft invoice before issuing to the client."
              : "Create a compliant tax invoice with automatic CGST, SGST, or IGST calculations."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-text-dark shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {saving ? "Processing..." : "Save & Issue Invoice"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Seller Tax Profile Info Box */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 sm:flex-row sm:items-center">
        <div>
          <span className="font-bold">Seller Profile: </span>
          <span>{billingProfile.tradeName || billingProfile.legalName || "Business"}</span>
          {billingProfile.gstin ? (
            <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-blue-800">
              GSTIN: {billingProfile.gstin}
            </span>
          ) : (
            <span className="ml-2 font-medium text-amber-700">
              (No GSTIN configured — Non-GST Invoice)
            </span>
          )}
          {billingProfile.state && (
            <span className="ml-2 text-text-grey">
              • State: {billingProfile.state} ({billingProfile.stateCode || "—"})
            </span>
          )}
        </div>
        <Link
          href="/vendor/invoices/settings"
          className="font-bold underline hover:text-brand-primary"
        >
          Update Billing Settings →
        </Link>
      </div>

      {/* Section 1: Client & Invoice Metadata */}
      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-2">
        {/* Client details */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-grey">
            Bill To (Client / Couple)
          </h2>

          <div>
            <label className="block text-xs font-semibold text-text-dark">
              Client Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Priya Sharma & Rahul Verma"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                Email Address
              </label>
              <input
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dark">
              Billing Address
            </label>
            <input
              type="text"
              placeholder="Street / Flat / Locality"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai, Bengaluru"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                State / Union Territory
              </label>
              <select
                value={clientStateCode}
                onChange={(e) => handleClientStateChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              >
                <option value="">-- Select State --</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dark">
              Client GSTIN (Optional, for B2B Input Credit)
            </label>
            <input
              type="text"
              placeholder="27AAAAA0000A1Z5"
              value={clientGstin}
              maxLength={15}
              onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-xs uppercase text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* Invoice Dates & Place of Supply */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-grey">
            Invoice Details & Tax Jurisdiction
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dark">
              Place of Supply <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 27 - Maharashtra"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
            <p className="mt-1 text-[11px] text-text-grey">
              Determines GST type:{" "}
              {isInterState ? (
                <span className="font-bold text-indigo-600">
                  Inter-state (IGST will be applied)
                </span>
              ) : (
                <span className="font-bold text-emerald-600">
                  Intra-state (CGST + SGST will be split 50:50)
                </span>
              )}
            </p>
          </div>

          {/* Quick GST Jurisdiction preview card */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/75 p-3.5 text-xs">
            <div className="font-bold text-text-dark">Statutory Classification</div>
            <div className="mt-1 text-text-grey">
              Seller: {billingProfile.state || "Not Set"} (Code: {sellerStateCode || "—"})
            </div>
            <div className="text-text-grey">
              Supply Location: {placeOfSupply || "Not Set"}
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold">
              {isInterState ? (
                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                  Inter-State Supply (IGST Applicable)
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  Intra-State Supply (CGST + SGST Applicable)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Line Items Table */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-base font-bold text-text-dark">Items & Services</h2>
            <p className="text-xs text-text-grey">
              Add individual wedding services or equipment rentals with statutory SAC codes.
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-text-dark transition hover:bg-gray-200"
          >
            + Add Line Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-text-grey">
              <tr>
                <th className="py-3 pl-3 pr-2" style={{ width: "32%" }}>
                  Description
                </th>
                <th className="px-2 py-3" style={{ width: "16%" }}>
                  SAC Code
                </th>
                <th className="px-2 py-3 text-center" style={{ width: "8%" }}>
                  Qty
                </th>
                <th className="px-2 py-3" style={{ width: "10%" }}>
                  Unit
                </th>
                <th className="px-2 py-3 text-right" style={{ width: "12%" }}>
                  Rate (₹)
                </th>
                <th className="px-2 py-3 text-right" style={{ width: "8%" }}>
                  Disc (₹)
                </th>
                <th className="px-2 py-3 text-right" style={{ width: "8%" }}>
                  GST %
                </th>
                <th className="px-2 py-3 text-right" style={{ width: "12%" }}>
                  Total (₹)
                </th>
                <th className="py-3 pl-2 pr-3 text-center" style={{ width: "4%" }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => {
                const gross = (item.quantity || 0) * (item.unitPrice || 0);
                const disc = Math.min(gross, item.discount || 0);
                const taxable = Math.max(0, gross - disc);
                const tax = Math.round(((taxable * (item.gstRate || 0)) / 100) * 100) / 100;
                const lineTotal = taxable + tax;

                return (
                  <tr key={item.key} className="align-top hover:bg-gray-50/50">
                    {/* Description */}
                    <td className="py-2.5 pl-3 pr-2">
                      <input
                        type="text"
                        placeholder="e.g. Wedding Photography 2-Day Package"
                        value={item.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-text-dark outline-none focus:border-brand-primary"
                      />
                    </td>

                    {/* SAC Code */}
                    <td className="px-2 py-2.5">
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="e.g. 998311"
                          value={item.sacCode}
                          onChange={(e) => updateItem(idx, { sacCode: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 font-mono text-xs text-text-dark outline-none focus:border-brand-primary"
                        />
                        <select
                          className="w-full rounded border border-gray-200 bg-white text-[10px] text-text-grey"
                          onChange={(e) => {
                            const preset = SAC_PRESETS.find((p) => p.code === e.target.value);
                            if (preset) {
                              updateItem(idx, { sacCode: preset.code, gstRate: preset.defaultRate });
                            }
                          }}
                          value=""
                        >
                          <option value="">Quick SAC Preset...</option>
                          {SAC_PRESETS.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.code} ({p.name})
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="px-2 py-2.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-center text-xs text-text-dark outline-none focus:border-brand-primary"
                      />
                    </td>

                    {/* Unit */}
                    <td className="px-2 py-2.5">
                      <input
                        type="text"
                        placeholder="service"
                        value={item.unit}
                        onChange={(e) => updateItem(idx, { unit: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-text-dark outline-none focus:border-brand-primary"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="px-2 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-right font-mono text-xs text-text-dark outline-none focus:border-brand-primary"
                      />
                    </td>

                    {/* Discount */}
                    <td className="px-2 py-2.5">
                      <input
                        type="number"
                        min="0"
                        value={item.discount}
                        onChange={(e) => updateItem(idx, { discount: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-right font-mono text-xs text-text-dark outline-none focus:border-brand-primary"
                      />
                    </td>

                    {/* GST Rate */}
                    <td className="px-2 py-2.5">
                      <select
                        value={item.gstRate}
                        onChange={(e) => updateItem(idx, { gstRate: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-xs text-text-dark outline-none focus:border-brand-primary"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>

                    {/* Line Total */}
                    <td className="px-2 py-2.5 text-right font-bold text-text-dark">
                      <div className="font-mono text-xs">{formatINR(lineTotal)}</div>
                      <div className="text-[10px] text-text-grey font-normal">
                        Tax: {formatINR(tax)}
                      </div>
                    </td>

                    {/* Remove */}
                    <td className="py-2.5 pl-2 pr-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="rounded p-1 text-text-grey transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="mt-6 flex flex-col justify-end border-t border-gray-100 pt-4 sm:flex-row">
          <div className="w-full space-y-2 text-xs sm:max-w-sm">
            <div className="flex justify-between text-text-grey">
              <span>Gross Subtotal:</span>
              <span className="font-mono">{formatINR(computedSubtotal)}</span>
            </div>
            {computedDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">- {formatINR(computedDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-text-dark">
              <span>Taxable Amount:</span>
              <span className="font-mono">{formatINR(computedTaxable)}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-indigo-700">
                <span>IGST:</span>
                <span className="font-mono">{formatINR(computedIgst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-text-grey">
                  <span>CGST:</span>
                  <span className="font-mono">{formatINR(computedCgst)}</span>
                </div>
                <div className="flex justify-between text-text-grey">
                  <span>SGST:</span>
                  <span className="font-mono">{formatINR(computedSgst)}</span>
                </div>
              </>
            )}

            {computedRoundOff !== 0 && (
              <div className="flex justify-between text-text-grey text-[11px]">
                <span>Round Off:</span>
                <span className="font-mono">
                  {computedRoundOff > 0 ? `+${computedRoundOff}` : computedRoundOff}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-extrabold text-text-dark">
              <span>Grand Total:</span>
              <span className="font-mono text-brand-primary">
                {formatINR(computedGrandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Bank Details & Notes */}
      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-2">
        {/* Bank & UPI for this invoice */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-grey">
            Remittance & Bank Information
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                Account Holder Name
              </label>
              <input
                type="text"
                placeholder="Business Name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                Account Number
              </label>
              <input
                type="text"
                placeholder="000123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-xs text-text-dark outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dark">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-xs uppercase text-text-dark outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dark">
              UPI ID / VPA
            </label>
            <input
              type="text"
              placeholder="wedding@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-grey">
            Notes & Terms
          </h2>

          <div>
            <label className="block text-xs font-semibold text-text-dark">
              Client Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dark">
              Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
            />
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="text-xs text-text-grey">
          Grand Total: <span className="text-base font-bold text-brand-primary">{formatINR(computedGrandTotal)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/invoices"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-text-dark hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-text-dark hover:bg-gray-50 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="rounded-xl bg-brand-primary px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary/90 disabled:opacity-50"
          >
            Save & Issue Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
