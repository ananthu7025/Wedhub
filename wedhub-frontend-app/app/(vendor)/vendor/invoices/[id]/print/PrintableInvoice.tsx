"use client";

import { useEffect } from "react";
import type { VendorInvoice } from "@/lib/api/vendor-invoices.types";
import { getPublicMediaUrl } from "@/lib/media/url";

interface PrintableInvoiceProps {
  invoice: VendorInvoice;
}

export function PrintableInvoice({ invoice }: PrintableInvoiceProps) {
  useEffect(() => {
    // Optionally focus for print
  }, []);

  function formatINR(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  const isGstInvoice = Boolean(invoice.sellerGstin);
  const logoUrl = invoice.sellerLogoKey ? getPublicMediaUrl(invoice.sellerLogoKey) : null;

  return (
    <div className="min-h-screen bg-neutral-100 py-6 text-neutral-900 print:bg-white print:p-0 print:m-0">
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
            Print Preview
          </span>
          <span className="font-mono text-xs font-semibold text-neutral-800">
            #{invoice.invoiceNumber}
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* A4 Document Body */}
      <div className="print-container mx-auto max-w-4xl border border-neutral-300 bg-white p-10 font-sans text-xs shadow-xl print:border-none print:p-0">
        {/* Top Tax Header */}
        <div className="border-b-2 border-neutral-800 pb-3 text-center">
          <h1 className="text-xl font-extrabold uppercase tracking-wide text-neutral-900">
            {isGstInvoice ? "TAX INVOICE" : "INVOICE"}
          </h1>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
            (Issued under Section 31 of the Central Goods and Services Tax Act, 2017)
          </p>
        </div>

        {/* Header: Seller Brand & Invoice Identifiers */}
        <div className="grid grid-cols-2 gap-6 border-b border-neutral-200 py-4">
          {/* Seller Branding (with logo if present, else typographic header) */}
          <div className="flex flex-col justify-between">
            <div>
              {logoUrl ? (
                <div className="mb-2">
                  {/* Dynamic Vendor Logo: If uploaded, render cleanly. If not uploaded, container is omitted. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={invoice.sellerBusinessName}
                    className="max-h-14 max-w-[200px] object-contain"
                  />
                </div>
              ) : null}
              <h2 className="text-base font-bold text-neutral-900">
                {invoice.sellerBusinessName}
              </h2>
              {invoice.sellerLegalName && invoice.sellerLegalName !== invoice.sellerBusinessName && (
                <p className="text-[11px] text-neutral-600">
                  Legal: {invoice.sellerLegalName}
                </p>
              )}
            </div>
            <div className="mt-2 space-y-0.5 text-[11px] text-neutral-700">
              {invoice.sellerAddress && <div>{invoice.sellerAddress}</div>}
              {(invoice.sellerCity || invoice.sellerState) && (
                <div>
                  {[invoice.sellerCity, invoice.sellerState].filter(Boolean).join(", ")}
                  {invoice.sellerStateCode && ` (State Code: ${invoice.sellerStateCode})`}
                </div>
              )}
              {invoice.sellerGstin && (
                <div className="font-semibold text-neutral-900">
                  GSTIN: <span className="font-mono">{invoice.sellerGstin}</span>
                </div>
              )}
              {invoice.sellerPan && (
                <div>
                  PAN: <span className="font-mono">{invoice.sellerPan}</span>
                </div>
              )}
              {invoice.sellerPhone && <div>Phone: {invoice.sellerPhone}</div>}
              {invoice.sellerEmail && <div>Email: {invoice.sellerEmail}</div>}
            </div>
          </div>

          {/* Invoice Meta Numbers */}
          <div className="flex flex-col items-end justify-between text-right text-[11px]">
            <div className="space-y-1">
              <div className="rounded border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Invoice No:</span>
                <div className="font-mono text-sm font-bold text-neutral-900">
                  {invoice.invoiceNumber}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-neutral-700">
              <div>
                <span className="text-neutral-500">Invoice Date: </span>
                <span className="font-semibold text-neutral-900">{formatDate(invoice.issueDate)}</span>
              </div>
              {invoice.dueDate && (
                <div>
                  <span className="text-neutral-500">Due Date: </span>
                  <span className="font-semibold text-neutral-900">{formatDate(invoice.dueDate)}</span>
                </div>
              )}
              <div>
                <span className="text-neutral-500">Place of Supply: </span>
                <span className="font-semibold text-neutral-900">{invoice.placeOfSupply}</span>
              </div>
              <div>
                <span className="text-neutral-500">Tax Payable on Reverse Charge: </span>
                <span className="font-semibold text-neutral-900">No</span>
              </div>
              <div>
                <span className="text-neutral-500">Nature of Supply: </span>
                <span className="font-bold text-neutral-900">
                  {invoice.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer / Recipient Details */}
        <div className="border-b border-neutral-200 py-3 text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Details of Receiver (Billed To):
          </span>
          <div className="mt-1 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-neutral-900">{invoice.clientName}</div>
              {invoice.clientAddress && <div className="text-neutral-700">{invoice.clientAddress}</div>}
              {(invoice.clientCity || invoice.clientState) && (
                <div className="text-neutral-700">
                  {[invoice.clientCity, invoice.clientState].filter(Boolean).join(", ")}
                  {invoice.clientStateCode && ` (State Code: ${invoice.clientStateCode})`}
                </div>
              )}
            </div>
            <div className="space-y-0.5 text-neutral-700">
              {invoice.clientGstin && (
                <div>
                  GSTIN / Unique ID: <span className="font-mono font-bold text-neutral-900">{invoice.clientGstin}</span>
                </div>
              )}
              {invoice.clientPhone && <div>Phone: {invoice.clientPhone}</div>}
              {invoice.clientEmail && <div>Email: {invoice.clientEmail}</div>}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full border-collapse border border-neutral-300 text-[10px]">
            <thead>
              <tr className="bg-neutral-100 text-neutral-800 text-center font-bold uppercase">
                <th className="border border-neutral-300 p-1.5" rowSpan={2} style={{ width: "4%" }}>#</th>
                <th className="border border-neutral-300 p-1.5 text-left" rowSpan={2} style={{ width: "32%" }}>
                  Description of Goods / Services
                </th>
                <th className="border border-neutral-300 p-1.5" rowSpan={2} style={{ width: "9%" }}>HSN / SAC</th>
                <th className="border border-neutral-300 p-1.5" rowSpan={2} style={{ width: "5%" }}>Qty</th>
                <th className="border border-neutral-300 p-1.5" rowSpan={2} style={{ width: "6%" }}>Unit</th>
                <th className="border border-neutral-300 p-1.5 text-right" rowSpan={2} style={{ width: "9%" }}>Rate (₹)</th>
                <th className="border border-neutral-300 p-1.5 text-right" rowSpan={2} style={{ width: "11%" }}>
                  Taxable Value (₹)
                </th>
                {invoice.isInterState ? (
                  <th className="border border-neutral-300 p-1 text-center" colSpan={2}>IGST</th>
                ) : (
                  <>
                    <th className="border border-neutral-300 p-1 text-center" colSpan={2}>CGST</th>
                    <th className="border border-neutral-300 p-1 text-center" colSpan={2}>SGST</th>
                  </>
                )}
                <th className="border border-neutral-300 p-1.5 text-right" rowSpan={2} style={{ width: "12%" }}>
                  Total (₹)
                </th>
              </tr>
              <tr className="bg-neutral-50 text-neutral-700 text-center font-semibold">
                {invoice.isInterState ? (
                  <>
                    <th className="border border-neutral-300 p-1" style={{ width: "5%" }}>Rate</th>
                    <th className="border border-neutral-300 p-1 text-right" style={{ width: "8%" }}>Amt (₹)</th>
                  </>
                ) : (
                  <>
                    <th className="border border-neutral-300 p-1" style={{ width: "4%" }}>%</th>
                    <th className="border border-neutral-300 p-1 text-right" style={{ width: "6%" }}>Amt (₹)</th>
                    <th className="border border-neutral-300 p-1" style={{ width: "4%" }}>%</th>
                    <th className="border border-neutral-300 p-1 text-right" style={{ width: "6%" }}>Amt (₹)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="align-top">
                  <td className="border border-neutral-300 p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-neutral-300 p-1.5">
                    <div className="font-semibold text-neutral-900">{item.description}</div>
                  </td>
                  <td className="border border-neutral-300 p-1.5 font-mono text-center">
                    {item.sacCode || "—"}
                  </td>
                  <td className="border border-neutral-300 p-1.5 text-center">{item.quantity}</td>
                  <td className="border border-neutral-300 p-1.5 text-center">{item.unit}</td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono">
                    {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="border border-neutral-300 p-1.5 text-right font-mono">
                    {item.taxableAmount.toFixed(2)}
                  </td>

                  {invoice.isInterState ? (
                    <>
                      <td className="border border-neutral-300 p-1 text-center">{item.igstRate}%</td>
                      <td className="border border-neutral-300 p-1 text-right font-mono">
                        {item.igstAmount.toFixed(2)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-neutral-300 p-1 text-center">{item.cgstRate}%</td>
                      <td className="border border-neutral-300 p-1 text-right font-mono">
                        {item.cgstAmount.toFixed(2)}
                      </td>
                      <td className="border border-neutral-300 p-1 text-center">{item.sgstRate}%</td>
                      <td className="border border-neutral-300 p-1 text-right font-mono">
                        {item.sgstAmount.toFixed(2)}
                      </td>
                    </>
                  )}

                  <td className="border border-neutral-300 p-1.5 text-right font-mono font-bold">
                    {item.totalAmount.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Total Summary Row */}
              <tr className="bg-neutral-100 font-bold">
                <td className="border border-neutral-300 p-1.5 text-right uppercase" colSpan={6}>
                  Total:
                </td>
                <td className="border border-neutral-300 p-1.5 text-right font-mono">
                  {invoice.taxableAmount.toFixed(2)}
                </td>
                {invoice.isInterState ? (
                  <>
                    <td className="border border-neutral-300 p-1"></td>
                    <td className="border border-neutral-300 p-1 text-right font-mono">
                      {invoice.igstAmount.toFixed(2)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-neutral-300 p-1"></td>
                    <td className="border border-neutral-300 p-1 text-right font-mono">
                      {invoice.cgstAmount.toFixed(2)}
                    </td>
                    <td className="border border-neutral-300 p-1"></td>
                    <td className="border border-neutral-300 p-1 text-right font-mono">
                      {invoice.sgstAmount.toFixed(2)}
                    </td>
                  </>
                )}
                <td className="border border-neutral-300 p-1.5 text-right font-mono text-neutral-900">
                  {invoice.grandTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words & Totals Summary */}
        <div className="grid grid-cols-2 gap-6 border-b border-neutral-200 py-3">
          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-500">
                Amount Chargeable (in words):
              </span>
              <div className="text-xs font-bold text-neutral-900">
                {invoice.amountInWords || "Rupees " + invoice.grandTotal + " Only"}
              </div>
            </div>

            {invoice.notes && (
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase text-neutral-500">Notes:</span>
                <p className="text-[11px] text-neutral-700 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-neutral-700">
              <span>Taxable Value:</span>
              <span className="font-mono">{formatINR(invoice.taxableAmount)}</span>
            </div>
            {invoice.isInterState ? (
              <div className="flex justify-between text-neutral-700">
                <span>Integrated GST (IGST):</span>
                <span className="font-mono">{formatINR(invoice.igstAmount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-neutral-700">
                  <span>Central GST (CGST):</span>
                  <span className="font-mono">{formatINR(invoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>State GST (SGST):</span>
                  <span className="font-mono">{formatINR(invoice.sgstAmount)}</span>
                </div>
              </>
            )}
            {invoice.roundOffAmount !== 0 && (
              <div className="flex justify-between text-neutral-600 text-[10px]">
                <span>Round Off:</span>
                <span className="font-mono">
                  {invoice.roundOffAmount > 0 ? `+${invoice.roundOffAmount}` : invoice.roundOffAmount}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-300 pt-1 text-sm font-extrabold text-neutral-900">
              <span>Invoice Total (INR):</span>
              <span className="font-mono">{formatINR(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatINR(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-neutral-900">
              <span>Balance Due:</span>
              <span className="font-mono">{formatINR(invoice.balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Bank & Remittance Details + Signatory Block */}
        <div className="grid grid-cols-2 gap-6 pt-4 text-[11px]">
          <div className="rounded border border-neutral-200 bg-neutral-50/50 p-3">
            <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-600">
              Bank / Remittance Details:
            </span>
            <div className="mt-1.5 space-y-0.5 text-neutral-800">
              {invoice.bankName && (
                <div>
                  Bank: <span className="font-semibold">{invoice.bankName}</span>
                </div>
              )}
              {invoice.accountName && (
                <div>
                  Account Holder: <span className="font-semibold">{invoice.accountName}</span>
                </div>
              )}
              {invoice.accountNumber && (
                <div>
                  A/C No: <span className="font-mono font-semibold">{invoice.accountNumber}</span>
                </div>
              )}
              {invoice.ifscCode && (
                <div>
                  IFSC Code: <span className="font-mono font-semibold">{invoice.ifscCode}</span>
                </div>
              )}
              {invoice.upiId && (
                <div>
                  UPI ID: <span className="font-semibold">{invoice.upiId}</span>
                </div>
              )}
              {!invoice.bankName && !invoice.upiId && (
                <div className="text-neutral-500">Contact vendor for bank remittance.</div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between text-right">
            <div>
              <span className="text-[10px] text-neutral-600">For </span>
              <span className="font-bold text-neutral-900">{invoice.sellerBusinessName}</span>
            </div>
            <div className="pt-12">
              <div className="border-t border-neutral-400 pt-1 inline-block min-w-[160px] text-center text-[10px] font-semibold text-neutral-600">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Declarations */}
        <div className="mt-4 border-t border-neutral-200 pt-2 text-[9px] text-neutral-500">
          <div className="font-bold uppercase">Declaration:</div>
          <p>
            We declare that this invoice shows the actual price of the goods / services described and that all particulars are true and correct.
          </p>
          {invoice.terms && (
            <p className="mt-1 whitespace-pre-line text-neutral-600">
              <span className="font-semibold">Terms & Conditions: </span>
              {invoice.terms}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
