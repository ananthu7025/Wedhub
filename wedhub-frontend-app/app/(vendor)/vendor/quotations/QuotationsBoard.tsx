"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import type {
  QuotationSummaryMetrics,
  VendorQuotation,
  VendorQuotationStatus,
} from "@/lib/api/vendor-quotations.types";
import {
  convertMyQuotationToBooking,
  deleteMyQuotation,
  duplicateMyQuotation,
  markMyQuotationSent,
} from "@/lib/api/vendor-quotations-client";
import { formatQuotationWhatsAppMessage } from "@/lib/utils/whatsapp-quote";
import { formatApiError } from "@/lib/utils/error";

interface QuotationsBoardProps {
  initialQuotations: VendorQuotation[];
  metrics: QuotationSummaryMetrics;
  hideHeader?: boolean;
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

export function QuotationsBoard({ initialQuotations, metrics, hideHeader = false }: QuotationsBoardProps) {
  const router = useRouter();
  const [quotations, setQuotations] = useState<VendorQuotation[]>(initialQuotations);

  useEffect(() => {
    setQuotations(initialQuotations);
  }, [initialQuotations]);
  const [filterStatus, setFilterStatus] = useState<VendorQuotationStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeWhatsAppModalQuote, setActiveWhatsAppModalQuote] = useState<VendorQuotation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = quotations.filter((q) => {
    if (filterStatus !== "ALL" && q.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const qry = searchQuery.toLowerCase();
      const matchNum = q.quotationNumber.toLowerCase().includes(qry);
      const matchClient = q.clientName.toLowerCase().includes(qry);
      const matchTitle = q.title.toLowerCase().includes(qry);
      return matchNum || matchClient || matchTitle;
    }
    return true;
  });

  function formatINR(val: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
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

  async function handleDuplicate(quote: VendorQuotation) {
    setActionLoadingId(quote.id);
    setError(null);
    const res = await duplicateMyQuotation(quote.id);
    setActionLoadingId(null);
    if (res.success) {
      setQuotations((prev) => [res.data, ...prev]);
      router.push(`/vendor/quotations/${res.data.id}/edit`);
    } else {
      setError(formatApiError(res.error));
    }
  }

  async function handleDelete(quote: VendorQuotation) {
    if (!window.confirm(`Are you sure you want to delete quotation #${quote.quotationNumber}?`)) {
      return;
    }
    setActionLoadingId(quote.id);
    setError(null);
    const res = await deleteMyQuotation(quote.id);
    setActionLoadingId(null);
    if (res.success) {
      setQuotations((prev) => prev.filter((q) => q.id !== quote.id));
    } else {
      setError(formatApiError(res.error));
    }
  }

  async function handleConvertToBooking(quote: VendorQuotation) {
    if (!window.confirm(`Create a calendar booking for "${quote.clientName}" from quotation #${quote.quotationNumber}?`)) {
      return;
    }
    setActionLoadingId(quote.id);
    setError(null);
    const res = await convertMyQuotationToBooking(quote.id);
    setActionLoadingId(null);
    if (res.success) {
      router.push("/vendor/calendar");
    } else {
      setError(formatApiError(res.error));
    }
  }

  async function handleSendWhatsApp(quote: VendorQuotation) {
    const { url } = formatQuotationWhatsAppMessage(quote);
    if (url) {
      window.open(url, "_blank");
      if (quote.status === "DRAFT") {
        await markMyQuotationSent(quote.id, "WHATSAPP");
        setQuotations((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, status: "SENT", sentAt: new Date().toISOString() } : q))
        );
      }
      setActiveWhatsAppModalQuote(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Quotations</h1>
            <p className="text-sm text-neutral-500">
              Create professional branded proposals from packages and send directly via WhatsApp or PDF.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/vendor/quotations/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-hover active:scale-[0.98]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create Quotation
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      {!hideHeader && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-neutral-500">Quoted Value</span>
            <p className="mt-1 text-xl font-extrabold text-neutral-900">{formatINR(metrics.totalQuotedValue)}</p>
            <span className="text-[11px] text-neutral-400">{metrics.totalCount} total quotes</span>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-neutral-500">Accepted Value</span>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">{formatINR(metrics.totalAcceptedValue)}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{metrics.acceptedCount} accepted</span>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-neutral-500">Sent / Pending</span>
            <p className="mt-1 text-xl font-extrabold text-blue-600">{metrics.sentCount}</p>
            <span className="text-[11px] text-neutral-400">awaiting response</span>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-neutral-500">Conversion Rate</span>
            <p className="mt-1 text-xl font-extrabold text-brand-primary">{metrics.conversionRate}%</p>
            <span className="text-[11px] text-neutral-400">proposals closed</span>
          </div>
          <div className="hidden lg:block rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium text-neutral-500">Drafts</span>
            <p className="mt-1 text-xl font-extrabold text-neutral-700">{metrics.draftCount}</p>
            <span className="text-[11px] text-neutral-400">ready to send</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
          {(["ALL", "DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === st
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {st === "ALL" ? "All Proposals" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search by quote # or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3.5 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <svg
            className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Quotations List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center shadow-xs">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-neutral-900">No quotations found</h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            {quotations.length === 0
              ? "Start by creating your first branded proposal from existing packages to send to prospective couples."
              : "No quotations match the active filter or search terms."}
          </p>
          <div className="mt-5">
            <Link
              href="/vendor/quotations/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              + Create Quotation
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-3.5 pl-5 pr-3">Quote #</th>
                  <th className="py-3.5 px-3">Client &amp; Event</th>
                  <th className="py-3.5 px-3">Services / Packages</th>
                  <th className="py-3.5 px-3">Total Amount</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Valid Until</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-normal text-neutral-800">
                {filtered.map((quote) => {
                  const isBusy = actionLoadingId === quote.id;
                  return (
                    <tr key={quote.id} className="transition-colors hover:bg-neutral-50/60">
                      {/* Quote # */}
                      <td className="py-4 pl-5 pr-3 whitespace-nowrap">
                        <Link
                          href={`/vendor/quotations/${quote.id}`}
                          className="font-bold text-brand-primary hover:underline"
                        >
                          #{quote.quotationNumber}
                        </Link>
                        <div className="text-[11px] text-neutral-400">{formatDate(quote.issueDate)}</div>
                      </td>

                      {/* Client & Event */}
                      <td className="py-4 px-3 min-w-[180px]">
                        <div className="font-bold text-neutral-900">{quote.clientName}</div>
                        <div className="text-[11px] text-neutral-500">
                          {quote.eventType}
                          {quote.eventDate ? ` · ${formatDate(quote.eventDate)}` : ""}
                        </div>
                        {quote.clientPhone && (
                          <div className="text-[11px] text-neutral-400">{quote.clientPhone}</div>
                        )}
                      </td>

                      {/* Services */}
                      <td className="py-4 px-3 max-w-[220px]">
                        <div className="font-medium text-neutral-800 truncate" title={quote.title}>
                          {quote.title}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {quote.items.length} {quote.items.length === 1 ? "item" : "items"}
                          {quote.items[0] ? ` · ${quote.items[0].name}` : ""}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-extrabold text-neutral-900 text-sm">
                          {formatINR(quote.grandTotal)}
                        </span>
                        {quote.taxRate > 0 && (
                          <div className="text-[10px] text-neutral-400">incl. {quote.taxRate}% GST</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <Badge variant={statusBadgeVariant(quote.status)}>
                          {quote.status.charAt(0) + quote.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>

                      {/* Valid Until */}
                      <td className="py-4 px-3 whitespace-nowrap text-[11px] text-neutral-500">
                        {formatDate(quote.validUntil)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Quick Share Button */}
                          <button
                            type="button"
                            onClick={() => setActiveWhatsAppModalQuote(quote)}
                            title="Share on WhatsApp"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/10 px-2.5 py-1.5 text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/20 transition"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
                            </svg>
                            <span className="hidden md:inline">WhatsApp</span>
                          </button>

                          {/* Print / PDF Button */}
                          <Link
                            href={`/vendor/quotations/${quote.id}/print`}
                            target="_blank"
                            title="Print / Save PDF"
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="6 9 6 2 18 2 18 9" />
                              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            <span className="hidden md:inline">PDF</span>
                          </Link>

                          {/* View Detail Link */}
                          <Link
                            href={`/vendor/quotations/${quote.id}`}
                            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                          >
                            View
                          </Link>

                          {/* Secondary options */}
                          <div className="relative inline-block text-left group">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>
                            <div className="invisible group-hover:visible group-focus-within:visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-150 absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                              {quote.status !== "ACCEPTED" && quote.status !== "DECLINED" && (
                                <Link
                                  href={`/vendor/quotations/${quote.id}/edit`}
                                  className="block px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                                >
                                  Edit Quotation
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDuplicate(quote)}
                                disabled={isBusy}
                                className="w-full text-left px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                              >
                                Duplicate Quote
                              </button>
                              <Link
                                href={`/vendor/invoices/new?leadId=${quote.leadId || ""}&quoteId=${quote.id}`}
                                className="block px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                              >
                                Convert to Invoice
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleConvertToBooking(quote)}
                                disabled={isBusy}
                                className="w-full text-left px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
                              >
                                Convert to Booking
                              </button>
                              <div className="my-1 border-t border-neutral-100" />
                              <button
                                type="button"
                                onClick={() => handleDelete(quote)}
                                disabled={isBusy}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WhatsApp Sharing Modal */}
      {activeWhatsAppModalQuote && (
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
                onClick={() => setActiveWhatsAppModalQuote(null)}
                className="text-neutral-400 hover:text-neutral-600 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Sending to: <strong className="text-neutral-900">{activeWhatsAppModalQuote.clientName}</strong>
              {activeWhatsAppModalQuote.clientPhone ? ` (${activeWhatsAppModalQuote.clientPhone})` : " (No phone number saved)"}
            </p>

            {/* Message Preview */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 max-h-56 overflow-y-auto text-xs text-neutral-800 whitespace-pre-wrap font-sans">
              {formatQuotationWhatsAppMessage(activeWhatsAppModalQuote).message}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const msg = formatQuotationWhatsAppMessage(activeWhatsAppModalQuote).message;
                  navigator.clipboard.writeText(msg);
                  setCopiedMessage(true);
                  setTimeout(() => setCopiedMessage(false), 2000);
                }}
                className="w-full sm:w-auto rounded-xl border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {copiedMessage ? "Copied Message!" : "Copy Text"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const link = `${origin}/quotes/${activeWhatsAppModalQuote.viewToken}`;
                  navigator.clipboard.writeText(link);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="w-full sm:w-auto rounded-xl border border-neutral-300 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {copiedLink ? "Link Copied!" : "Copy Proposal Link"}
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp(activeWhatsAppModalQuote)}
                disabled={!activeWhatsAppModalQuote.clientPhone}
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
