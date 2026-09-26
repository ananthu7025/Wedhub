"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloseIcon, CheckIcon } from "@/components/portfolio/icons";
import { Badge } from "@/components/ui/Badge";
import type { VendorQuotation, VendorQuotationStatus } from "@/lib/api/vendor-quotations.types";
import {
  convertMyQuotationToBooking,
  convertMyQuotationToInvoice,
  duplicateMyQuotation,
  markMyQuotationSent,
} from "@/lib/api/vendor-quotations-client";
import { formatQuotationWhatsAppMessage } from "@/lib/utils/whatsapp-quote";
import { formatApiError } from "@/lib/utils/error";

interface QuotationDetailViewProps {
  quotation: VendorQuotation;
}

function statusBadgeVariant(status: VendorQuotationStatus): "blue" | "amber" | "green" | "grey" | "crimson" | "red" {
  switch (status) {
    case "DRAFT":
      return "grey";
    case "SENT":
      return "blue";
    case "ACCEPTED":
      return "green";
    case "DECLINED":
      return "crimson";
    case "EXPIRED":
      return "amber";
  }
}

export function QuotationDetailView({ quotation: initialQuotation }: QuotationDetailViewProps) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<VendorQuotation>(initialQuotation);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function formatINR(val: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: quotation.currency || "INR",
      maximumFractionDigits: 0,
    }).format(val);
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  async function handleSendWhatsApp() {
    const { url } = formatQuotationWhatsAppMessage(quotation);
    if (url) {
      window.open(url, "_blank");
      if (quotation.status === "DRAFT") {
        const res = await markMyQuotationSent(quotation.id, "WHATSAPP");
        if (res.success) {
          setQuotation(res.data);
        }
      }
      setIsWhatsAppModalOpen(false);
    }
  }

  async function handleConvertToInvoice() {
    setLoadingAction("invoice");
    setError(null);
    const res = await convertMyQuotationToInvoice(quotation.id);
    setLoadingAction(null);
    if (res.success) {
      const data = res.data;
      const params = new URLSearchParams({
        quoteId: data.quotationId,
        leadId: data.leadId || "",
        clientName: data.clientName,
        clientPhone: data.clientPhone || "",
        clientEmail: data.clientEmail || "",
      });
      router.push(`/vendor/invoices/new?${params.toString()}`);
    } else {
      setError(formatApiError(res.error));
    }
  }

  async function handleConvertToBooking() {
    if (!window.confirm(`Create a booking on your calendar for "${quotation.clientName}"?`)) return;
    setLoadingAction("booking");
    setError(null);
    const res = await convertMyQuotationToBooking(quotation.id);
    setLoadingAction(null);
    if (res.success) {
      router.push("/vendor/calendar");
    } else {
      setError(formatApiError(res.error));
    }
  }

  async function handleDuplicate() {
    setLoadingAction("duplicate");
    setError(null);
    const res = await duplicateMyQuotation(quotation.id);
    setLoadingAction(null);
    if (res.success) {
      router.push(`/vendor/quotations/${res.data.id}/edit`);
    } else {
      setError(formatApiError(res.error));
    }
  }

  const publicLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/quotes/${quotation.viewToken}`
      : `/quotes/${quotation.viewToken}`;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link href="/vendor/finances?tab=quotes" className="hover:text-neutral-900">
              Quotes & Invoices
            </Link>
            <span>/</span>
            <span className="font-semibold text-neutral-800">#{quotation.quotationNumber}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Proposal #{quotation.quotationNumber}
            </h1>
            <Badge variant={statusBadgeVariant(quotation.status)}>
              {quotation.status.charAt(0) + quotation.status.slice(1).toLowerCase()}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20ba5a] transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
            </svg>
            Send WhatsApp
          </button>

          {/* Print / PDF Button */}
          <Link
            href={`/vendor/quotations/${quotation.id}/print`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / PDF
          </Link>

          {/* Copy Public Link */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(publicLink);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition"
          >
            {copiedLink ? "Copied Link!" : "Copy Proposal Link"}
          </button>

          {/* Convert to Invoice */}
          <button
            type="button"
            onClick={handleConvertToInvoice}
            disabled={loadingAction === "invoice"}
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition disabled:opacity-50"
          >
            {loadingAction === "invoice" ? "Converting..." : "Convert to Invoice"}
          </button>

          {/* Convert to Booking */}
          <button
            type="button"
            onClick={handleConvertToBooking}
            disabled={loadingAction === "booking"}
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition disabled:opacity-50"
          >
            {loadingAction === "booking" ? "Booking..." : "Convert to Booking"}
          </button>

          {/* Edit / Duplicate */}
          {quotation.status !== "ACCEPTED" && quotation.status !== "DECLINED" && (
            <Link
              href={`/vendor/quotations/${quotation.id}/edit`}
              className="rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 transition"
            >
              Edit Quote
            </Link>
          )}

          <button
            type="button"
            onClick={handleDuplicate}
            disabled={loadingAction === "duplicate"}
            className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition disabled:opacity-50"
          >
            Duplicate
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Status Notice Banner */}
      {quotation.status === "SENT" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">Sent to Couple:</span>
            <span>
              Proposal sent via {quotation.sentVia || "WhatsApp"} on {formatDate(quotation.sentAt)}. Valid until{" "}
              {formatDate(quotation.validUntil)}.
            </span>
          </div>
          <a href={publicLink} target="_blank" className="font-bold underline text-blue-800">
            Preview Couple View ↗
          </a>
        </div>
      )}

      {quotation.status === "ACCEPTED" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold"><CheckIcon className="inline h-3.5 w-3.5" /> Proposal Accepted!</span>
            <span>Accepted by the couple on {formatDate(quotation.acceptedAt)}. Ready for invoice or booking.</span>
          </div>
          <button
            type="button"
            onClick={handleConvertToInvoice}
            className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800"
          >
            Generate Invoice
          </button>
        </div>
      )}

      {/* Branded Document Sheet */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-10 shadow-sm space-y-8">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-neutral-200/80 pb-6">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-primary">
              {quotation.vendorCategory || "Wedding Vendor"}
            </span>
            <h2 className="text-2xl font-black text-neutral-900">{quotation.vendorBusinessName}</h2>
            {quotation.vendorPhone && <p className="text-xs text-neutral-600">Phone: {quotation.vendorPhone}</p>}
            {quotation.vendorEmail && <p className="text-xs text-neutral-600">Email: {quotation.vendorEmail}</p>}
            {quotation.vendorAddress && <p className="text-xs text-neutral-600">{quotation.vendorAddress}</p>}
            {quotation.vendorGstin && (
              <p className="text-[11px] text-neutral-500 font-mono">GSTIN: {quotation.vendorGstin}</p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Quotation</span>
            <div className="text-xl font-black text-neutral-900">#{quotation.quotationNumber}</div>
            <p className="text-xs text-neutral-500">Issue Date: {formatDate(quotation.issueDate)}</p>
            {quotation.validUntil && (
              <p className="text-xs text-neutral-500">Valid Until: {formatDate(quotation.validUntil)}</p>
            )}
          </div>
        </div>

        {/* Client & Event Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-xl bg-neutral-50/70 p-5 border border-neutral-100">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Prepared For</span>
            <h3 className="text-base font-bold text-neutral-900">{quotation.clientName}</h3>
            {quotation.clientPhone && <p className="text-xs text-neutral-600">{quotation.clientPhone}</p>}
            {quotation.clientEmail && <p className="text-xs text-neutral-600">{quotation.clientEmail}</p>}
            {quotation.clientAddress && <p className="text-xs text-neutral-600">{quotation.clientAddress}</p>}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Event Details</span>
            <h4 className="text-sm font-bold text-neutral-900">{quotation.eventType}</h4>
            <p className="text-xs text-neutral-600">
              Date: <strong className="text-neutral-800">{formatDate(quotation.eventDate)}</strong>
            </p>
            {quotation.eventLocation && (
              <p className="text-xs text-neutral-600">Location: {quotation.eventLocation}</p>
            )}
            {quotation.guestCount && (
              <p className="text-xs text-neutral-600">Guest Count: {quotation.guestCount} guests</p>
            )}
          </div>
        </div>

        {/* Introduction note */}
        {quotation.introduction && (
          <div className="rounded-xl border border-neutral-200/60 bg-white p-4 text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {quotation.introduction}
          </div>
        )}

        {/* Deliverables Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Included Packages &amp; Deliverables
          </h3>

          <div className="overflow-hidden rounded-xl border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-3 pl-4 pr-2">#</th>
                  <th className="py-3 px-3">Service &amp; Inclusions</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 pl-3 pr-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {quotation.items.map((it, idx) => (
                  <tr key={it.id} className="align-top">
                    <td className="py-3.5 pl-4 pr-2 text-neutral-400 font-medium">{idx + 1}</td>
                    <td className="py-3.5 px-3 space-y-1.5">
                      <div className="font-bold text-neutral-900 text-sm">{it.name}</div>
                      {it.description && <p className="text-xs text-neutral-500">{it.description}</p>}
                      {it.inclusions && it.inclusions.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {it.inclusions.map((inc, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary"
                            >
                              <CheckIcon className="inline h-3 w-3" /> {inc}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap font-medium text-neutral-700">
                      {formatINR(it.unitPrice)}
                    </td>
                    <td className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap font-bold text-neutral-900">
                      {formatINR(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financials & Summary */}
        <div className="flex flex-col sm:flex-row justify-end">
          <div className="w-full sm:w-80 space-y-2 text-xs border-t sm:border-t-0 pt-4 sm:pt-0">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-semibold text-neutral-900">{formatINR(quotation.subtotal)}</span>
            </div>
            {quotation.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatINR(quotation.discount)}</span>
              </div>
            )}
            {quotation.taxRate > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>GST ({quotation.taxRate}%)</span>
                <span>+{formatINR(quotation.taxAmount)}</span>
              </div>
            )}
            <div className="border-t-2 border-neutral-900 pt-2 flex items-baseline justify-between">
              <span className="text-sm font-bold text-neutral-900">Total Investment</span>
              <span className="text-xl font-black text-brand-primary">{formatINR(quotation.grandTotal)}</span>
            </div>
            {quotation.amountInWords && (
              <p className="text-[11px] text-neutral-400 italic text-right pt-0.5">{quotation.amountInWords}</p>
            )}
          </div>
        </div>

        {/* Payment Terms & Conditions */}
        {(quotation.paymentTerms || quotation.terms) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-neutral-200/80 pt-6">
            {quotation.paymentTerms && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Payment Milestones</h4>
                <div className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed rounded-xl bg-neutral-50/50 p-3.5 border border-neutral-100">
                  {quotation.paymentTerms}
                </div>
              </div>
            )}

            {quotation.terms && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Terms &amp; Conditions</h4>
                <div className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed rounded-xl bg-neutral-50/50 p-3.5 border border-neutral-100">
                  {quotation.terms}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Modal */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/20 text-[#128C7E]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
                  </svg>
                </span>
                <h3 className="font-bold text-neutral-900">Send Quote via WhatsApp</h3>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg"
                aria-label="Close"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Sending to: <strong className="text-neutral-900">{quotation.clientName}</strong>
              {quotation.clientPhone ? ` (${quotation.clientPhone})` : " (No phone number entered)"}
            </p>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 max-h-56 overflow-y-auto text-xs text-neutral-800 whitespace-pre-wrap font-sans">
              {formatQuotationWhatsAppMessage(quotation).message}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const msg = formatQuotationWhatsAppMessage(quotation).message;
                  navigator.clipboard.writeText(msg);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="w-full sm:w-auto rounded-xl border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {copiedText ? "Copied Text!" : "Copy Text"}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={!quotation.clientPhone}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#20ba5a] transition disabled:opacity-50"
              >
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
