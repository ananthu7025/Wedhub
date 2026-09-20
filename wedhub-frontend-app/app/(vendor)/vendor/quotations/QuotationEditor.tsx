"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PackageSelf } from "@/lib/api/vendor-self.types";
import type {
  CreateVendorQuotationBody,
  LeadQuotationPrefill,
  QuotationItemInput,
  VendorQuotation,
} from "@/lib/api/vendor-quotations.types";
import { createMyQuotation, updateMyQuotation } from "@/lib/api/vendor-quotations-client";
import { formatQuotationWhatsAppMessage } from "@/lib/utils/whatsapp-quote";
import { formatApiError } from "@/lib/utils/error";

interface QuotationEditorProps {
  initialQuotation?: VendorQuotation | null;
  availablePackages: PackageSelf[];
  leadPrefill?: LeadQuotationPrefill | null;
  vendorCurrency: string;
  vendorBusinessName: string;
}

interface EditorLineItem extends Omit<QuotationItemInput, "inclusions"> {
  key: string;
  inclusions: string[];
}

export function QuotationEditor({
  initialQuotation,
  availablePackages,
  leadPrefill,
  vendorCurrency = "INR",
  vendorBusinessName,
}: QuotationEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(initialQuotation);

  // Dates
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultValidStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [issueDate, setIssueDate] = useState(
    initialQuotation?.issueDate ? initialQuotation.issueDate.split("T")[0] : todayStr,
  );
  const [validUntil, setValidUntil] = useState(
    initialQuotation?.validUntil ? initialQuotation.validUntil.split("T")[0] : defaultValidStr,
  );

  // Proposal Info
  const [title, setTitle] = useState(
    initialQuotation?.title ??
      (leadPrefill?.clientName
        ? `Wedding Services Proposal for ${leadPrefill.clientName}`
        : `Wedding Proposal - ${vendorBusinessName}`),
  );
  const [eventType, setEventType] = useState(initialQuotation?.eventType ?? "Wedding");
  const [eventDate, setEventDate] = useState(
    initialQuotation?.eventDate
      ? initialQuotation.eventDate.split("T")[0]
      : leadPrefill?.eventDate ?? "",
  );
  const [eventLocation, setEventLocation] = useState(
    initialQuotation?.eventLocation ?? leadPrefill?.eventLocation ?? "",
  );
  const [guestCount, setGuestCount] = useState<number | "">(
    initialQuotation?.guestCount ?? leadPrefill?.guestCount ?? "",
  );

  // Client Details
  const [clientName, setClientName] = useState(
    initialQuotation?.clientName ?? leadPrefill?.clientName ?? "",
  );
  const [clientPhone, setClientPhone] = useState(
    initialQuotation?.clientPhone ?? leadPrefill?.clientPhone ?? "",
  );
  const [clientEmail, setClientEmail] = useState(
    initialQuotation?.clientEmail ?? leadPrefill?.clientEmail ?? "",
  );
  const [clientAddress, setClientAddress] = useState(initialQuotation?.clientAddress ?? "");

  // Line items state
  const [items, setItems] = useState<EditorLineItem[]>(() => {
    if (initialQuotation?.items && initialQuotation.items.length > 0) {
      return initialQuotation.items.map((it, idx) => ({
        key: `item-${idx}-${it.id}`,
        id: it.id,
        packageId: it.packageId ?? null,
        name: it.name,
        description: it.description ?? "",
        inclusions: [...it.inclusions],
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "Package",
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
      }));
    }

    if (availablePackages.length > 0) {
      const firstPkg = availablePackages[0];
      return [
        {
          key: `pkg-${firstPkg.id}-${Date.now()}`,
          packageId: firstPkg.id,
          name: firstPkg.name,
          description: firstPkg.description ?? "",
          inclusions: [...firstPkg.inclusions],
          quantity: 1,
          unit: "Package",
          unitPrice: Number(firstPkg.price) || 0,
          discount: 0,
        },
      ];
    }

    return [
      {
        key: `item-0-${Date.now()}`,
        name: "Full Wedding Coverage Package",
        description: "Comprehensive photo and video coverage for all rituals",
        inclusions: ["Candid Photography", "Traditional Videography", "High-Resolution Edited Deliverables"],
        quantity: 1,
        unit: "Package",
        unitPrice: 50000,
        discount: 0,
      },
    ];
  });

  // Package import modal state
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(() =>
    items.map((it) => it.packageId).filter((id): id is string => Boolean(id)),
  );

  // Financials & Taxes
  const [overallDiscount, setOverallDiscount] = useState<number>(initialQuotation?.discount ?? 0);
  const [applyGst, setApplyGst] = useState<boolean>((initialQuotation?.taxRate ?? 0) > 0);
  const [gstRate, setGstRate] = useState<number>(initialQuotation?.taxRate || 18);

  // Notes & Messages
  const [introduction, setIntroduction] = useState(
    initialQuotation?.introduction ??
      `Dear ${clientName || "Couple"},\nCongratulations on your upcoming wedding! We are delighted to present this customized proposal crafted specifically for your celebration. Our team is committed to making your wedding memories truly unforgettable.`,
  );

  const [paymentTerms, setPaymentTerms] = useState(
    initialQuotation?.paymentTerms ??
      `• 40% advance payment to confirm and block the event dates\n• 50% payment on the day of the main event\n• 10% balance upon final delivery of albums & video files`,
  );

  const [terms, setTerms] = useState(
    initialQuotation?.terms ??
      `• Raw files / preview gallery will be shared within 10 days of the event\n• Album design revisions must be submitted within 15 days of draft receipt\n• Travel & lodging outside the primary city to be provided or reimbursed by client`,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inclusion pill draft state per item
  const [newInclusionDrafts, setNewInclusionDrafts] = useState<Record<string, string>>({});

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice - (it.discount || 0)), 0);
  const taxable = Math.max(0, subtotal - (overallDiscount || 0));
  const effectiveGstRate = applyGst ? gstRate : 0;
  const taxAmount = Number(((taxable * effectiveGstRate) / 100).toFixed(2));
  const grandTotal = Math.round(taxable + taxAmount);

  function formatINR(val: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: vendorCurrency,
      maximumFractionDigits: 0,
    }).format(val);
  }

  function handleAddInclusion(itemKey: string) {
    const draft = (newInclusionDrafts[itemKey] || "").trim();
    if (!draft) return;
    setItems((prev) =>
      prev.map((it) =>
        it.key === itemKey ? { ...it, inclusions: [...(it.inclusions || []), draft] } : it,
      ),
    );
    setNewInclusionDrafts((prev) => ({ ...prev, [itemKey]: "" }));
  }

  function handleRemoveInclusion(itemKey: string, indexToRemove: number) {
    setItems((prev) =>
      prev.map((it) =>
        it.key === itemKey
          ? { ...it, inclusions: (it.inclusions || []).filter((_, idx) => idx !== indexToRemove) }
          : it,
      ),
    );
  }

  function handleImportPackage(pkg: PackageSelf) {
    const newItem: EditorLineItem = {
      key: `pkg-${pkg.id}-${Date.now()}`,
      packageId: pkg.id,
      name: pkg.name,
      description: pkg.description ?? "",
      inclusions: [...pkg.inclusions],
      quantity: 1,
      unit: "Package",
      unitPrice: Number(pkg.price) || 0,
      discount: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedPackageIds((prev) => [...prev, pkg.id]);
    setIsPackageModalOpen(false);
  }

  function handleAddCustomItem() {
    const newItem: EditorLineItem = {
      key: `custom-${Date.now()}`,
      name: "Custom Add-on Service",
      description: "",
      inclusions: [],
      quantity: 1,
      unit: "Service",
      unitPrice: 10000,
      discount: 0,
    };
    setItems((prev) => [...prev, newItem]);
  }

  function handleRemoveItem(key: string) {
    if (items.length <= 1) {
      alert("A quotation must have at least one package or service item.");
      return;
    }
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  async function handleSubmit(andSendViaWhatsApp = false) {
    if (!clientName.trim()) {
      setError("Please enter the client or couple's name.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a quotation title.");
      return;
    }
    if (items.length === 0) {
      setError("Please include at least one package or service item.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: CreateVendorQuotationBody = {
      leadId: initialQuotation?.leadId ?? leadPrefill?.leadId ?? null,
      title: title.trim(),
      issueDate,
      validUntil: validUntil || null,
      eventType,
      eventDate: eventDate || null,
      eventLocation: eventLocation.trim() || null,
      guestCount: typeof guestCount === "number" ? guestCount : null,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || null,
      clientEmail: clientEmail.trim() || null,
      clientAddress: clientAddress.trim() || null,
      introduction: introduction.trim() || null,
      paymentTerms: paymentTerms.trim() || null,
      terms: terms.trim() || null,
      currency: vendorCurrency,
      discount: overallDiscount,
      taxRate: applyGst ? gstRate : 0,
      items: items.map((it) => ({
        packageId: it.packageId ?? null,
        name: it.name.trim(),
        description: it.description?.trim() || null,
        inclusions: it.inclusions,
        quantity: Number(it.quantity) || 1,
        unit: it.unit || "Package",
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
      })),
    };

    try {
      if (isEditing && initialQuotation) {
        const res = await updateMyQuotation(initialQuotation.id, payload);
        setSaving(false);
        if (res.success) {
          if (andSendViaWhatsApp) {
            const { url } = formatQuotationWhatsAppMessage(res.data);
            if (url) window.open(url, "_blank");
          }
          router.refresh();
          router.push(`/vendor/quotations/${res.data.id}`);
        } else {
          setError(formatApiError(res.error));
        }
      } else {
        const res = await createMyQuotation(payload);
        setSaving(false);
        if (res.success) {
          if (andSendViaWhatsApp) {
            const { url } = formatQuotationWhatsAppMessage(res.data);
            if (url) window.open(url, "_blank");
          }
          router.refresh();
          router.push(`/vendor/quotations/${res.data.id}`);
        } else {
          setError(formatApiError(res.error));
        }
      }
    } catch (err: unknown) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to save quotation");
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link href="/vendor/finances?tab=quotes" className="hover:text-neutral-900">
              Quotes & Invoices
            </Link>
            <span>/</span>
            <span className="font-semibold text-neutral-800">
              {isEditing ? `Edit Quote #${initialQuotation?.quotationNumber}` : "New Quotation"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            {isEditing ? `Edit Quotation #${initialQuotation?.quotationNumber}` : "Create Branded Quotation"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/vendor/finances?tab=quotes"
            className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#20ba5a] disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
            </svg>
            Save &amp; Send WhatsApp
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {leadPrefill && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <span className="font-bold">Lead CRM Link:</span>
            <span>Pre-filled from lead enquiry for {leadPrefill.clientName}. Saving will mark lead as QUOTED.</span>
          </div>
          <Link href="/vendor/leads" className="font-semibold underline">
            View Lead
          </Link>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Proposal Details, Packages & Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card: Title & Dates */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Proposal Details</h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Quotation Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Wedding Photography & Cinema Proposal for Priya & Rahul"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-semibold text-neutral-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                >
                  <option value="Wedding">Wedding</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Reception">Reception</option>
                  <option value="Pre-Wedding">Pre-Wedding Shoot</option>
                  <option value="Sangeet / Haldi">Sangeet / Haldi</option>
                  <option value="Corporate / Event">Corporate / Event</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Event Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Location / Venue</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. The Leela Palace, Bengaluru"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Packages & Items Section */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Packages &amp; Services</h2>
                <p className="text-xs text-neutral-400">Import your predefined packages or build custom service tiers.</p>
              </div>

              <div className="flex items-center gap-2">
                {availablePackages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPackageModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary/10 px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-primary/20 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20.59 13.41L11 3.83V3H3v8h.83l9.58 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z" />
                    </svg>
                    Import Package ({availablePackages.length})
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  + Custom Item
                </button>
              </div>
            </div>

            {/* Line Items List */}
            <div className="space-y-4">
              {items.map((it, idx) => (
                <div
                  key={it.key}
                  className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-4 space-y-3 transition-colors hover:border-neutral-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((item) => (item.key === it.key ? { ...item, name: val } : item)),
                            );
                          }}
                          placeholder="Package or Service Name"
                          className="w-full font-bold text-sm text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-brand-primary focus:bg-white px-1 py-0.5 rounded focus:outline-none"
                        />
                      </div>

                      <textarea
                        rows={1}
                        value={it.description || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((item) => (item.key === it.key ? { ...item, description: val } : item)),
                          );
                        }}
                        placeholder="Short description of coverage, ceremonies or deliverables..."
                        className="w-full text-xs text-neutral-600 bg-transparent border border-transparent hover:border-neutral-200 focus:border-neutral-300 focus:bg-white p-1 rounded focus:outline-none resize-y"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.key)}
                      title="Remove this item"
                      className="text-neutral-400 hover:text-red-600 p-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Inclusions Pill Tags */}
                  <div className="rounded-lg bg-white p-3 border border-neutral-200/70 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Deliverables &amp; Inclusions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(it.inclusions || []).map((inc, incIdx) => (
                        <span
                          key={incIdx}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 pl-2.5 pr-1.5 py-0.5 text-xs font-semibold text-brand-primary"
                        >
                          <span>✓ {inc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInclusion(it.key, incIdx)}
                            className="rounded-full hover:bg-brand-primary/20 text-[10px] w-3.5 h-3.5 flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </span>
                      ))}

                      {/* Add inclusion mini-input */}
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="+ Add deliverable..."
                          value={newInclusionDrafts[it.key] || ""}
                          onChange={(e) =>
                            setNewInclusionDrafts((prev) => ({ ...prev, [it.key]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddInclusion(it.key);
                            }
                          }}
                          className="rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-700 placeholder-neutral-400 focus:border-brand-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddInclusion(it.key)}
                          className="text-[11px] font-bold text-brand-primary hover:underline px-1"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quantity, Unit Price, Total Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500">Qty</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={it.quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          setItems((prev) =>
                            prev.map((item) => (item.key === it.key ? { ...item, quantity: val } : item)),
                          );
                        }}
                        className="mt-0.5 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500">Unit</label>
                      <input
                        type="text"
                        value={it.unit || "Package"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((item) => (item.key === it.key ? { ...item, unit: val } : item)),
                          );
                        }}
                        className="mt-0.5 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setItems((prev) =>
                            prev.map((item) => (item.key === it.key ? { ...item, unitPrice: val } : item)),
                          );
                        }}
                        className="mt-0.5 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] font-medium text-neutral-500">Line Total</span>
                      <span className="block mt-1 font-bold text-neutral-900 text-sm">
                        {formatINR(it.quantity * it.unitPrice - (it.discount || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Terms Section */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
              Personalized Note &amp; Terms
            </h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Introductory Message to Couple</label>
              <textarea
                rows={3}
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Payment Milestones &amp; Schedule</label>
              <textarea
                rows={3}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Terms &amp; Conditions / Cancellation Policy</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 p-3 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Client Details & Financial Summary Card */}
        <div className="space-y-6">
          {/* Client Details Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-3.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Couple Details</h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Client / Couple Name *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Pooja Sharma &amp; Rahul Kapoor"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 font-semibold focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">WhatsApp / Phone Number</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400">Used for 1-click WhatsApp proposal sending</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Email Address</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Guest Count</label>
              <input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 350"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Address / City</label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="e.g. Indiranagar, Bengaluru"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Summary Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-3.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Investment Summary</h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-semibold text-neutral-900">{formatINR(subtotal)}</span>
              </div>

              {/* Overall Discount Input */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-neutral-600">Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 text-right rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-900 font-semibold focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* GST Toggle */}
              <div className="border-t border-neutral-100 pt-2 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-neutral-700 font-medium">Apply GST / Tax</span>
                  <input
                    type="checkbox"
                    checked={applyGst}
                    onChange={(e) => setApplyGst(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
                  />
                </label>

                {applyGst && (
                  <div className="flex items-center justify-between gap-2 pl-2">
                    <span className="text-[11px] text-neutral-500">GST Rate (%)</span>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-800 focus:border-brand-primary focus:outline-none"
                    >
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18% (Standard)</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                )}

                {applyGst && (
                  <div className="flex justify-between text-neutral-600 pl-2 text-[11px]">
                    <span>Tax Amount ({gstRate}%)</span>
                    <span>+{formatINR(taxAmount)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="border-t-2 border-neutral-900 pt-3 flex items-baseline justify-between">
                <div>
                  <span className="block text-sm font-bold text-neutral-900">Grand Total</span>
                  <span className="block text-[10px] text-neutral-400">All deliverables included</span>
                </div>
                <span className="text-xl font-extrabold text-brand-primary">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : isEditing ? "Update Quotation" : "Save Quotation"}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#20ba5a] disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
                </svg>
                Save &amp; Send on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Package Picker Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Import from My Packages</h3>
                <p className="text-xs text-neutral-500">
                  Select an existing package to import its deliverables and pricing directly into this proposal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {availablePackages.map((pkg) => {
                const isSelected = selectedPackageIds.includes(pkg.id);
                return (
                  <div
                    key={pkg.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 transition hover:border-brand-primary hover:bg-neutral-50/50"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900">{pkg.name}</span>
                        {isSelected && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Already added
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-neutral-500 line-clamp-2">{pkg.description}</p>
                      )}
                      {pkg.inclusions.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {pkg.inclusions.slice(0, 4).map((inc, i) => (
                            <span key={i} className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                              ✓ {inc}
                            </span>
                          ))}
                          {pkg.inclusions.length > 4 && (
                            <span className="text-[10px] text-neutral-400">+{pkg.inclusions.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                      <span className="font-extrabold text-base text-neutral-900">
                        {formatINR(Number(pkg.price) || 0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleImportPackage(pkg)}
                        className="rounded-xl bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover"
                      >
                        + Select Package
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-neutral-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
