"use client";

import type { VendorQuotation } from "@/lib/api/vendor-quotations.types";
import { getPublicMediaUrl } from "@/lib/media/url";

interface PrintableQuotationProps {
  quotation: VendorQuotation;
}

export function PrintableQuotation({ quotation }: PrintableQuotationProps) {
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

  const logoUrl = quotation.vendorLogoKey ? getPublicMediaUrl(quotation.vendorLogoKey) : null;

  return (
    <div className="min-h-screen bg-neutral-100 py-6 text-neutral-900 print:bg-white print:p-0 print:m-0 font-sans">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 12mm 12mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Screen Toolbar (Hidden on Print) */}
      <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-xl bg-white px-6 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Quotation Preview
          </span>
          <span className="font-mono text-xs font-semibold text-neutral-800">
            #{quotation.quotationNumber}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.close()}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* A4 Document Body */}
      <div className="print-container mx-auto max-w-4xl border border-neutral-300 bg-white p-10 font-sans text-xs shadow-xl print:border-none print:p-0">
        {/* Header with Vendor Branding & Quotation Ref */}
        <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-6">
          <div className="flex items-start gap-4">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={quotation.vendorBusinessName}
                className="h-16 w-16 rounded-xl object-cover border border-neutral-200"
              />
            )}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-primary">
                {quotation.vendorCategory || "Wedding Vendor Services"}
              </span>
              <h1 className="text-xl font-black text-neutral-900 leading-tight">
                {quotation.vendorBusinessName}
              </h1>
              {quotation.vendorPhone && <p className="text-[11px] text-neutral-600">Phone: {quotation.vendorPhone}</p>}
              {quotation.vendorEmail && <p className="text-[11px] text-neutral-600">Email: {quotation.vendorEmail}</p>}
              {quotation.vendorAddress && <p className="text-[11px] text-neutral-600">{quotation.vendorAddress}</p>}
              {quotation.vendorGstin && (
                <p className="text-[10px] text-neutral-500 font-mono">GSTIN: {quotation.vendorGstin}</p>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Quotation</span>
            <div className="text-xl font-black text-neutral-900">#{quotation.quotationNumber}</div>
            <p className="text-[11px] text-neutral-600">Date: {formatDate(quotation.issueDate)}</p>
            {quotation.validUntil && (
              <p className="text-[11px] font-medium text-brand-primary">
                Valid Until: {formatDate(quotation.validUntil)}
              </p>
            )}
          </div>
        </div>

        {/* Client & Event Details Banner */}
        <div className="my-6 grid grid-cols-2 gap-6 rounded-xl bg-neutral-50 p-5 border border-neutral-200">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Proposal For</span>
            <h2 className="text-sm font-bold text-neutral-900">{quotation.clientName}</h2>
            {quotation.clientPhone && <p className="text-[11px] text-neutral-600">{quotation.clientPhone}</p>}
            {quotation.clientEmail && <p className="text-[11px] text-neutral-600">{quotation.clientEmail}</p>}
            {quotation.clientAddress && <p className="text-[11px] text-neutral-600">{quotation.clientAddress}</p>}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Event Details</span>
            <h3 className="text-sm font-bold text-neutral-900">{quotation.eventType}</h3>
            <p className="text-[11px] text-neutral-600">
              Event Date: <strong className="text-neutral-800">{formatDate(quotation.eventDate)}</strong>
            </p>
            {quotation.eventLocation && (
              <p className="text-[11px] text-neutral-600">Location: {quotation.eventLocation}</p>
            )}
            {quotation.guestCount && (
              <p className="text-[11px] text-neutral-600">Guest Count: {quotation.guestCount} guests</p>
            )}
          </div>
        </div>

        {/* Introduction / Cover Note */}
        {quotation.introduction && (
          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 text-[11px] text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {quotation.introduction}
          </div>
        )}

        {/* Table of Deliverables */}
        <div className="mb-6">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-neutral-900 bg-neutral-50 text-[11px] font-bold text-neutral-700">
                <th className="py-2.5 pl-3 pr-2">#</th>
                <th className="py-2.5 px-3">Service &amp; Inclusions</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 pl-3 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {quotation.items.map((it, idx) => (
                <tr key={it.id} className="align-top">
                  <td className="py-3 pl-3 pr-2 text-neutral-400 font-medium">{idx + 1}</td>
                  <td className="py-3 px-3 space-y-1">
                    <div className="font-bold text-neutral-900 text-xs">{it.name}</div>
                    {it.description && <p className="text-[11px] text-neutral-500">{it.description}</p>}
                    {it.inclusions && it.inclusions.length > 0 && (
                      <div className="pt-1">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-neutral-600">
                          {it.inclusions.map((inc, i) => (
                            <li key={i} className="flex items-center gap-1 font-medium">
                              <span className="text-brand-primary">✓</span> {inc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap text-[11px]">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap font-medium text-neutral-700 text-[11px]">
                    {formatINR(it.unitPrice)}
                  </td>
                  <td className="py-3 pl-3 pr-3 text-right whitespace-nowrap font-bold text-neutral-900 text-xs">
                    {formatINR(it.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="mb-6 flex justify-end">
          <div className="w-72 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-neutral-900">{formatINR(quotation.subtotal)}</span>
            </div>
            {quotation.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{formatINR(quotation.discount)}</span>
              </div>
            )}
            {quotation.taxRate > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>GST ({quotation.taxRate}%):</span>
                <span>+{formatINR(quotation.taxAmount)}</span>
              </div>
            )}
            <div className="border-t-2 border-neutral-900 pt-2 flex items-baseline justify-between font-bold">
              <span className="text-xs uppercase tracking-wider text-neutral-900">Total Investment:</span>
              <span className="text-base font-black text-neutral-900">{formatINR(quotation.grandTotal)}</span>
            </div>
            {quotation.amountInWords && (
              <p className="text-[10px] text-neutral-500 italic text-right pt-0.5">{quotation.amountInWords}</p>
            )}
          </div>
        </div>

        {/* Payment Terms & Terms / Conditions */}
        {(quotation.paymentTerms || quotation.terms) && (
          <div className="border-t border-neutral-200 pt-5 grid grid-cols-2 gap-6 text-[11px]">
            {quotation.paymentTerms && (
              <div className="space-y-1">
                <h4 className="font-bold uppercase tracking-wider text-neutral-700">Payment Schedule</h4>
                <p className="text-neutral-600 whitespace-pre-wrap leading-relaxed">{quotation.paymentTerms}</p>
              </div>
            )}

            {quotation.terms && (
              <div className="space-y-1">
                <h4 className="font-bold uppercase tracking-wider text-neutral-700">Terms &amp; Conditions</h4>
                <p className="text-neutral-600 whitespace-pre-wrap leading-relaxed">{quotation.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Signatures Footer */}
        <div className="mt-12 border-t border-neutral-200 pt-8 flex items-end justify-between text-[11px] text-neutral-500">
          <div className="space-y-6">
            <div className="w-48 border-b border-neutral-300" />
            <p>Authorized Signature ({quotation.vendorBusinessName})</p>
          </div>
          <div className="space-y-6 text-right">
            <div className="w-48 border-b border-neutral-300 ml-auto" />
            <p>Client Acceptance Signature ({quotation.clientName})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
