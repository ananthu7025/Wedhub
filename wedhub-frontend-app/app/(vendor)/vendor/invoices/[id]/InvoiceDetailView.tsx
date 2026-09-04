"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  VendorInvoice,
  VendorPaymentMethod,
} from "@/lib/api/vendor-invoices.types";
import {
  cancelMyInvoice,
  deleteMyInvoice,
  deleteMyInvoicePayment,
  duplicateMyInvoice,
  issueMyInvoice,
  recordMyInvoicePayment,
} from "@/lib/api/vendor-invoices-client";
import { formatApiError } from "@/lib/utils/gst";

interface InvoiceDetailViewProps {
  initialInvoice: VendorInvoice;
}

export function InvoiceDetailView({ initialInvoice }: InvoiceDetailViewProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<VendorInvoice>(initialInvoice);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(invoice.balanceDue.toString());
  const [paymentMethod, setPaymentMethod] = useState<VendorPaymentMethod>("UPI");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Cancel form state
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // General loading & feedback
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  function formatDateTime(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  const isOverdue =
    invoice.status === "ISSUED" &&
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date() &&
    invoice.balanceDue > 0;

  async function handleIssue() {
    if (!confirm("Are you sure you want to issue this invoice? Once issued, its line items and prices cannot be modified.")) {
      return;
    }
    setBusyAction("issue");
    setFeedback(null);
    const res = await issueMyInvoice(invoice.id);
    setBusyAction(null);
    if (res.success) {
      setInvoice(res.data);
      setFeedback({ type: "success", message: `Invoice #${res.data.invoiceNumber} has been issued!` });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  async function handleDuplicate() {
    setBusyAction("duplicate");
    setFeedback(null);
    const res = await duplicateMyInvoice(invoice.id);
    setBusyAction(null);
    if (res.success) {
      router.push(`/vendor/invoices/${res.data.id}/edit`);
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  async function handleDeleteDraft() {
    if (!confirm("Are you sure you want to permanently delete this draft invoice?")) {
      return;
    }
    setBusyAction("delete");
    setFeedback(null);
    const res = await deleteMyInvoice(invoice.id);
    setBusyAction(null);
    if (res.success) {
      router.push("/vendor/invoices");
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid payment amount greater than 0." });
      return;
    }
    if (amountNum > invoice.balanceDue) {
      setFeedback({
        type: "error",
        message: `Payment amount (${formatINR(amountNum)}) cannot exceed outstanding balance (${formatINR(invoice.balanceDue)}).`,
      });
      return;
    }
    if (paymentReference.trim().length > 100) {
      setFeedback({ type: "error", message: "Transaction reference cannot exceed 100 characters." });
      return;
    }
    if (paymentNotes.trim().length > 500) {
      setFeedback({ type: "error", message: "Payment notes cannot exceed 500 characters." });
      return;
    }

    setRecordingPayment(true);
    setFeedback(null);

    const res = await recordMyInvoicePayment(invoice.id, {
      amount: amountNum,
      paymentMethod,
      transactionReference: paymentReference.trim() || null,
      paymentDate: paymentDate.trim().split("T")[0],
      notes: paymentNotes.trim() || null,
    });

    setRecordingPayment(false);

    if (res.success) {
      setInvoice(res.data);
      setShowPaymentModal(false);
      setPaymentReference("");
      setPaymentNotes("");
      setPaymentAmount(res.data.balanceDue.toString());
      setFeedback({ type: "success", message: `Payment of ${formatINR(amountNum)} recorded successfully!` });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Are you sure you want to delete this payment record? The invoice balance will be recalculated accordingly.")) {
      return;
    }
    setBusyAction(`del-payment-${paymentId}`);
    setFeedback(null);
    const res = await deleteMyInvoicePayment(invoice.id, paymentId);
    setBusyAction(null);
    if (res.success) {
      setInvoice(res.data);
      setPaymentAmount(res.data.balanceDue.toString());
      setFeedback({ type: "success", message: "Payment reversed and removed from invoice history." });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  async function handleCancelInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (cancelReason.trim().length > 500) {
      setFeedback({ type: "error", message: "Cancellation reason cannot exceed 500 characters." });
      return;
    }
    setCancelling(true);
    setFeedback(null);

    const res = await cancelMyInvoice(invoice.id, cancelReason.trim() || undefined);
    setCancelling(false);

    if (res.success) {
      setInvoice(res.data);
      setShowCancelModal(false);
      setFeedback({ type: "success", message: "Invoice has been marked as CANCELLED." });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Top Breadcrumbs & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/vendor/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-grey hover:text-brand-primary"
          >
            ← Back to Invoices
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-dark">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                invoice.status === "DRAFT"
                  ? "bg-gray-100 text-gray-700"
                  : invoice.status === "ISSUED"
                  ? isOverdue
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                  : invoice.status === "PAID"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-600 border border-red-200"
              }`}
            >
              {invoice.status === "ISSUED" && isOverdue ? "OVERDUE" : invoice.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === "DRAFT" && (
            <>
              <Link
                href={`/vendor/invoices/${invoice.id}/edit`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-text-dark shadow-sm hover:bg-gray-50"
              >
                Edit Draft
              </Link>
              <button
                type="button"
                disabled={busyAction === "issue"}
                onClick={handleIssue}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {busyAction === "issue" ? "Issuing..." : "Issue Invoice"}
              </button>
              <button
                type="button"
                disabled={busyAction === "delete"}
                onClick={handleDeleteDraft}
                className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}

          {invoice.status === "ISSUED" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setPaymentAmount(invoice.balanceDue.toString());
                  setShowPaymentModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Record Payment
              </button>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Cancel Invoice
              </button>
            </>
          )}

          {invoice.status !== "DRAFT" && (
            <Link
              href={`/vendor/invoices/${invoice.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-text-dark shadow-sm hover:bg-gray-50"
            >
              <svg className="h-4 w-4 text-text-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / PDF
            </Link>
          )}

          <button
            type="button"
            disabled={busyAction === "duplicate"}
            onClick={handleDuplicate}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-text-dark hover:bg-gray-50 disabled:opacity-50"
            title="Duplicate as new draft"
          >
            Duplicate
          </button>
        </div>
      </div>

      {/* Alerts */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overdue Alert Banner */}
      {isOverdue && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900">
          <svg className="h-5 w-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-bold">Payment is Overdue: </span>
            This invoice was due on {formatDate(invoice.dueDate)}. Outstanding balance of {formatINR(invoice.balanceDue)} is pending collection.
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-grey">
            Grand Total
          </span>
          <div className="mt-2 text-xl font-extrabold text-text-dark">
            {formatINR(invoice.grandTotal)}
          </div>
          <div className="mt-1 text-[11px] text-text-grey">
            Tax included: {formatINR(invoice.totalTax)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-grey">
            Amount Paid
          </span>
          <div className="mt-2 text-xl font-extrabold text-emerald-600">
            {formatINR(invoice.paidAmount)}
          </div>
          <div className="mt-1 text-[11px] text-text-grey">
            {invoice.payments?.length ?? 0} transaction(s)
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-grey">
            Balance Due
          </span>
          <div
            className={`mt-2 text-xl font-extrabold ${
              invoice.balanceDue > 0
                ? isOverdue
                  ? "text-rose-600"
                  : "text-amber-600"
                : "text-emerald-600"
            }`}
          >
            {formatINR(invoice.balanceDue)}
          </div>
          <div className="mt-1 text-[11px] text-text-grey">
            {invoice.balanceDue === 0 ? "Fully Paid" : "Remaining to collect"}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-grey">
            Dates
          </span>
          <div className="mt-2 text-xs font-bold text-text-dark">
            Issued: {formatDate(invoice.issueDate)}
          </div>
          <div className="mt-1 text-[11px] text-text-grey">
            Due: {invoice.dueDate ? formatDate(invoice.dueDate) : "Immediate"}
          </div>
        </div>
      </div>

      {/* Invoice Document Preview Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Parties Header */}
        <div className="grid grid-cols-1 gap-8 border-b border-gray-100 pb-8 sm:grid-cols-2">
          {/* Seller */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-grey">
              Seller / Service Provider
            </span>
            <h2 className="mt-1 text-base font-bold text-text-dark">
              {invoice.sellerBusinessName}
            </h2>
            {invoice.sellerLegalName && invoice.sellerLegalName !== invoice.sellerBusinessName && (
              <p className="text-xs text-text-grey">Legal: {invoice.sellerLegalName}</p>
            )}
            <div className="mt-2 space-y-0.5 text-xs text-text-grey">
              {invoice.sellerGstin && (
                <div className="font-mono font-semibold text-text-dark">
                  GSTIN: {invoice.sellerGstin}
                </div>
              )}
              {invoice.sellerPan && <div>PAN: {invoice.sellerPan}</div>}
              {invoice.sellerAddress && <div>{invoice.sellerAddress}</div>}
              {(invoice.sellerCity || invoice.sellerState) && (
                <div>
                  {[invoice.sellerCity, invoice.sellerState].filter(Boolean).join(", ")}
                  {invoice.sellerStateCode && ` (State Code: ${invoice.sellerStateCode})`}
                </div>
              )}
              {invoice.sellerPhone && <div>Phone: {invoice.sellerPhone}</div>}
              {invoice.sellerEmail && <div>Email: {invoice.sellerEmail}</div>}
            </div>
          </div>

          {/* Buyer */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-grey">
              Billed To (Client)
            </span>
            <h2 className="mt-1 text-base font-bold text-text-dark">
              {invoice.clientName}
            </h2>
            <div className="mt-2 space-y-0.5 text-xs text-text-grey">
              {invoice.clientGstin && (
                <div className="font-mono font-semibold text-text-dark">
                  Client GSTIN: {invoice.clientGstin}
                </div>
              )}
              {invoice.clientAddress && <div>{invoice.clientAddress}</div>}
              {(invoice.clientCity || invoice.clientState) && (
                <div>
                  {[invoice.clientCity, invoice.clientState].filter(Boolean).join(", ")}
                  {invoice.clientStateCode && ` (${invoice.clientStateCode})`}
                </div>
              )}
              {invoice.clientPhone && <div>Phone: {invoice.clientPhone}</div>}
              {invoice.clientEmail && <div>Email: {invoice.clientEmail}</div>}
              <div className="pt-1 text-text-dark">
                <span className="font-semibold">Place of Supply: </span>
                {invoice.placeOfSupply}
                {invoice.isInterState ? (
                  <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    Inter-State (IGST)
                  </span>
                ) : (
                  <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Intra-State (CGST + SGST)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-text-grey">
              <tr>
                <th className="py-3 pl-3 pr-2">#</th>
                <th className="px-2 py-3">Description</th>
                <th className="px-2 py-3">SAC</th>
                <th className="px-2 py-3 text-center">Qty</th>
                <th className="px-2 py-3 text-right">Rate</th>
                <th className="px-2 py-3 text-right">Taxable</th>
                <th className="px-2 py-3 text-right">GST Rate</th>
                <th className="px-2 py-3 text-right">Tax</th>
                <th className="py-3 pl-2 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-text-dark">
              {invoice.items.map((it, idx) => {
                const tax = invoice.isInterState ? it.igstAmount : it.cgstAmount + it.sgstAmount;
                return (
                  <tr key={it.id || idx} className="hover:bg-gray-50/50">
                    <td className="py-3 pl-3 pr-2 text-text-grey">{idx + 1}</td>
                    <td className="px-2 py-3 font-medium">{it.description}</td>
                    <td className="px-2 py-3 font-mono text-text-grey">{it.sacCode || "—"}</td>
                    <td className="px-2 py-3 text-center">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="px-2 py-3 text-right font-mono">{formatINR(it.unitPrice)}</td>
                    <td className="px-2 py-3 text-right font-mono">{formatINR(it.taxableAmount)}</td>
                    <td className="px-2 py-3 text-right">{it.gstRate}%</td>
                    <td className="px-2 py-3 text-right font-mono">{formatINR(tax)}</td>
                    <td className="py-3 pl-2 pr-3 text-right font-bold font-mono">
                      {formatINR(it.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Breakdown */}
        <div className="mt-6 flex flex-col justify-end border-t border-gray-100 pt-6 sm:flex-row">
          <div className="w-full space-y-2 text-xs sm:max-w-xs">
            <div className="flex justify-between text-text-grey">
              <span>Subtotal:</span>
              <span className="font-mono">{formatINR(invoice.subtotal)}</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">- {formatINR(invoice.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-text-dark">
              <span>Taxable Amount:</span>
              <span className="font-mono">{formatINR(invoice.taxableAmount)}</span>
            </div>

            {invoice.isInterState ? (
              <div className="flex justify-between text-indigo-700 font-medium">
                <span>IGST:</span>
                <span className="font-mono">{formatINR(invoice.igstAmount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-text-grey">
                  <span>CGST:</span>
                  <span className="font-mono">{formatINR(invoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between text-text-grey">
                  <span>SGST:</span>
                  <span className="font-mono">{formatINR(invoice.sgstAmount)}</span>
                </div>
              </>
            )}

            {invoice.roundOffAmount !== 0 && (
              <div className="flex justify-between text-text-grey text-[11px]">
                <span>Round Off:</span>
                <span className="font-mono">
                  {invoice.roundOffAmount > 0
                    ? `+${invoice.roundOffAmount}`
                    : invoice.roundOffAmount}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-extrabold text-text-dark">
              <span>Grand Total:</span>
              <span className="font-mono text-brand-primary">{formatINR(invoice.grandTotal)}</span>
            </div>

            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Paid to Date:</span>
              <span className="font-mono">{formatINR(invoice.paidAmount)}</span>
            </div>

            <div className="flex justify-between border-t border-gray-100 pt-1 text-sm font-bold text-text-dark">
              <span>Balance Due:</span>
              <span className={`font-mono ${invoice.balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {formatINR(invoice.balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount in words */}
        {invoice.amountInWords && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-text-dark">
            <span className="font-semibold text-text-grey">Amount in Words: </span>
            <span className="font-bold">{invoice.amountInWords}</span>
          </div>
        )}

        {/* Remittance & Terms */}
        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 md:grid-cols-2 text-xs">
          <div>
            <h4 className="font-bold text-text-dark uppercase tracking-wider text-[11px]">
              Payment Instructions / Bank Details
            </h4>
            <div className="mt-2 space-y-1 text-text-grey">
              {invoice.bankName && <div>Bank: <span className="text-text-dark font-medium">{invoice.bankName}</span></div>}
              {invoice.accountName && <div>Account Name: <span className="text-text-dark font-medium">{invoice.accountName}</span></div>}
              {invoice.accountNumber && <div>A/C Number: <span className="font-mono text-text-dark font-medium">{invoice.accountNumber}</span></div>}
              {invoice.ifscCode && <div>IFSC Code: <span className="font-mono text-text-dark font-medium">{invoice.ifscCode}</span></div>}
              {invoice.upiId && <div>UPI ID: <span className="text-text-dark font-medium">{invoice.upiId}</span></div>}
              {!invoice.bankName && !invoice.upiId && <div>No bank details specified.</div>}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-text-dark uppercase tracking-wider text-[11px]">
              Notes & Terms
            </h4>
            {invoice.notes && (
              <p className="mt-1 text-text-grey whitespace-pre-line">{invoice.notes}</p>
            )}
            {invoice.terms && (
              <div className="mt-2">
                <span className="font-semibold text-text-grey text-[10px] uppercase">Terms:</span>
                <p className="mt-0.5 text-text-grey whitespace-pre-line">{invoice.terms}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="text-base font-bold text-text-dark">Payment History</h3>
            <p className="text-xs text-text-grey">
              Record of payments collected for this invoice.
            </p>
          </div>
          {invoice.status === "ISSUED" && invoice.balanceDue > 0 && (
            <button
              type="button"
              onClick={() => {
                setPaymentAmount(invoice.balanceDue.toString());
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              + Record Payment
            </button>
          )}
        </div>

        {invoice.payments?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-text-grey">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-text-grey">
                <tr>
                  <th className="py-2.5 pl-3 pr-2">Date</th>
                  <th className="px-2 py-2.5">Method</th>
                  <th className="px-2 py-2.5">Reference / UTR</th>
                  <th className="px-2 py-2.5">Notes</th>
                  <th className="px-2 py-2.5 text-right">Amount</th>
                  <th className="py-2.5 pl-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="py-3 pl-3 pr-2 font-medium text-text-dark">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="px-2 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-semibold text-text-dark">
                        {p.paymentMethod.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-mono text-text-grey">
                      {p.transactionReference || "—"}
                    </td>
                    <td className="px-2 py-3 text-text-grey">{p.notes || "—"}</td>
                    <td className="px-2 py-3 text-right font-bold font-mono text-emerald-600">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 pl-2 pr-3 text-right">
                      {invoice.status !== "CANCELLED" && (
                        <button
                          type="button"
                          disabled={busyAction === `del-payment-${p.id}`}
                          onClick={() => handleDeletePayment(p.id)}
                          className="rounded p-1 text-xs text-text-grey hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          title="Reverse this payment"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Activity Log */}
      {invoice.activities && invoice.activities.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-grey">
            Invoice Audit Trail
          </h3>
          <div className="mt-4 space-y-3">
            {invoice.activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <div className="mt-1 h-2 w-2 rounded-full bg-brand-primary shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-text-dark">{act.action}</span>
                  {act.metadata && typeof act.metadata === "object" && (
                    <span className="ml-2 text-text-grey">
                      {JSON.stringify(act.metadata)}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-grey">
                  {formatDateTime(act.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-text-dark">
                Record Payment for #{invoice.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-text-grey hover:text-text-dark"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text-dark">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={invoice.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-sm text-text-dark outline-none focus:border-brand-primary"
                  required
                />
                <div className="mt-1 text-[11px] text-text-grey">
                  Outstanding balance: <span className="font-bold">{formatINR(invoice.balanceDue)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text-dark">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as VendorPaymentMethod)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT, IMPS, RTGS)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text-dark">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-text-dark">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No / Bank UTR"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-dark">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Advance booking token"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-text-dark hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {recordingPayment ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Invoice Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-text-dark">
                Cancel Invoice #{invoice.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-text-grey hover:text-text-dark"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancelInvoice} className="mt-4 space-y-4 text-xs">
              <p className="text-text-grey">
                Cancelling this invoice will permanently lock it. Statutory GST guidelines prohibit deleting issued invoices. If you need to make corrections, cancel this invoice and duplicate it into a new draft.
              </p>

              <div>
                <label className="block font-semibold text-text-dark">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Order cancelled by couple, or incorrect GST rate applied"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-text-dark hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
