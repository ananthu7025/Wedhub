"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  InvoiceSummaryMetrics,
  VendorInvoice,
  VendorInvoiceStatus,
} from "@/lib/api/vendor-invoices.types";
import {
  deleteMyInvoice,
  duplicateMyInvoice,
  issueMyInvoice,
} from "@/lib/api/vendor-invoices-client";
import { formatApiError } from "@/lib/utils/error";

interface InvoicesBoardProps {
  initialInvoices: VendorInvoice[];
  initialMetrics: InvoiceSummaryMetrics | null;
}

export function InvoicesBoard({
  initialInvoices,
  initialMetrics,
}: InvoicesBoardProps) {
  const router = useRouter();

  const [invoices, setInvoices] = useState<VendorInvoice[]>(initialInvoices);
  const [metrics] = useState<InvoiceSummaryMetrics | null>(initialMetrics);

  const [activeTab, setActiveTab] = useState<"ALL" | VendorInvoiceStatus | "OVERDUE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Format currency in INR
  function formatINR(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Format date helper
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

  // Check if an invoice is overdue
  function isOverdue(inv: VendorInvoice): boolean {
    if (inv.status !== "ISSUED") return false;
    if (!inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date() && inv.balanceDue > 0;
  }

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    // Tab filter
    if (activeTab === "OVERDUE") {
      if (!isOverdue(inv)) return false;
    } else if (activeTab !== "ALL") {
      if (inv.status !== activeTab) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
      const matchClient = inv.clientName.toLowerCase().includes(q);
      const matchPhone = inv.clientPhone?.toLowerCase().includes(q) ?? false;
      const matchEmail = inv.clientEmail?.toLowerCase().includes(q) ?? false;
      if (!matchNum && !matchClient && !matchPhone && !matchEmail) return false;
    }

    return true;
  });

  async function handleIssue(id: string) {
    if (!confirm("Are you sure you want to issue this invoice? Once issued, it cannot be modified.")) {
      return;
    }
    setBusyInvoiceId(id);
    setFeedback(null);
    const res = await issueMyInvoice(id);
    setBusyInvoiceId(null);
    if (res.success) {
      setInvoices((prev) => prev.map((item) => (item.id === id ? res.data : item)));
      setFeedback({ type: "success", message: `Invoice #${res.data.invoiceNumber} issued successfully.` });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  async function handleDuplicate(id: string) {
    setBusyInvoiceId(id);
    setFeedback(null);
    const res = await duplicateMyInvoice(id);
    setBusyInvoiceId(null);
    if (res.success) {
      setFeedback({ type: "success", message: "Invoice duplicated as draft. Redirecting to edit..." });
      router.push(`/vendor/invoices/${res.data.id}/edit`);
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  async function handleDeleteDraft(id: string) {
    if (!confirm("Are you sure you want to delete this draft invoice? This action cannot be undone.")) {
      return;
    }
    setBusyInvoiceId(id);
    setFeedback(null);
    const res = await deleteMyInvoice(id);
    setBusyInvoiceId(null);
    if (res.success) {
      setInvoices((prev) => prev.filter((item) => item.id !== id));
      setFeedback({ type: "success", message: "Draft invoice deleted." });
      router.refresh();
    } else {
      setFeedback({ type: "error", message: formatApiError(res.error) });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-dark">
            Invoices & Billing
          </h1>
          <p className="mt-1 text-sm text-text-grey">
            Generate statutory Indian GST invoices, collect payments, and track receivables.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vendor/invoices/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-text-dark shadow-sm transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-text-grey" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Billing Settings
          </Link>
          <Link
            href="/vendor/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total Invoiced */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-grey truncate">
              Total Invoiced
            </span>
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-extrabold text-text-dark truncate">
            {formatINR(metrics?.totalInvoiced ?? 0)}
          </div>
          <div className="mt-1 text-[11px] sm:text-xs text-text-grey truncate">
            {metrics?.counts.all ?? 0} total invoices
          </div>
        </div>

        {/* Received */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-grey truncate">
              Collected
            </span>
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-extrabold text-emerald-600 truncate">
            {formatINR(metrics?.totalReceived ?? 0)}
          </div>
          <div className="mt-1 text-[11px] sm:text-xs text-text-grey truncate">
            {metrics?.counts.paid ?? 0} fully settled
          </div>
        </div>

        {/* Outstanding */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-grey truncate">
              Outstanding
            </span>
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-extrabold text-amber-600 truncate">
            {formatINR(metrics?.outstandingBalance ?? 0)}
          </div>
          <div className="mt-1 text-[11px] sm:text-xs text-text-grey truncate">
            Pending collection
          </div>
        </div>

        {/* Overdue */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-grey truncate">
              Overdue
            </span>
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div className="mt-2 sm:mt-3 text-xl sm:text-2xl font-extrabold text-rose-600 truncate">
            {formatINR(metrics?.overdueAmount ?? 0)}
          </div>
          <div className="mt-1 text-[11px] sm:text-xs text-rose-500 font-medium truncate">
            Past payment due
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3.5 rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
          {(
            [
              { key: "ALL", label: "All", count: metrics?.counts.all },
              { key: "DRAFT", label: "Drafts", count: metrics?.counts.draft },
              { key: "ISSUED", label: "Issued", count: metrics?.counts.issued },
              { key: "PAID", label: "Paid", count: metrics?.counts.paid },
              { key: "OVERDUE", label: "Overdue", count: undefined },
              { key: "CANCELLED", label: "Cancelled", count: metrics?.counts.cancelled },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-text-grey hover:bg-gray-100 hover:text-text-dark"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-200 text-text-dark"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] max-w-sm">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-grey"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search invoice, client, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-text-dark placeholder-text-grey outline-none transition focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Invoices List / Table */}
      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-text-dark">
            {searchQuery ? "No matching invoices found" : "No invoices created yet"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-text-grey">
            {searchQuery
              ? "Try clearing your search query or switching tabs."
              : "Create your first statutory GST invoice for wedding clients with automatic tax breakdowns and instant printable receipts."}
          </p>
          <div className="mt-6 flex gap-3">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-text-dark hover:bg-gray-50"
              >
                Clear Search
              </button>
            ) : (
              <Link
                href="/vendor/invoices/new"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary/90"
              >
                + Create First Invoice
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Invoices Card List */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filteredInvoices.map((inv) => {
              const overdue = isOverdue(inv);
              const isBusy = busyInvoiceId === inv.id;

              return (
                <div
                  key={`m-${inv.id}`}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/vendor/invoices/${inv.id}`}
                        className="font-mono text-xs font-bold text-brand-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                      {inv.isInterState && (
                        <span className="ml-1.5 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                          IGST
                        </span>
                      )}
                      <p className="mt-1 font-bold text-text-dark text-sm">{inv.clientName}</p>
                      <p className="text-[11px] text-text-grey">{inv.clientPhone || inv.clientEmail || "—"}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        inv.status === "DRAFT"
                          ? "bg-gray-100 text-gray-700"
                          : inv.status === "ISSUED"
                          ? overdue
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                          : inv.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-600 border border-red-200"
                      }`}
                    >
                      {inv.status === "ISSUED" && overdue ? "OVERDUE" : inv.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs">
                    <div>
                      <span className="text-[11px] text-text-grey">Total Amount</span>
                      <p className="font-extrabold text-text-dark">{formatINR(inv.grandTotal)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-text-grey">Balance Due</span>
                      <p
                        className={`font-extrabold ${
                          inv.balanceDue > 0
                            ? overdue
                              ? "text-rose-600"
                              : "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatINR(inv.balanceDue)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs">
                    <span className="text-[11px] text-text-muted">
                      {inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : `Issued ${formatDate(inv.issueDate)}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/vendor/invoices/${inv.id}`}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-text-dark"
                      >
                        View
                      </Link>
                      {inv.status === "DRAFT" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleIssue(inv.id)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Issue
                        </button>
                      )}
                      {inv.status !== "DRAFT" && (
                        <Link
                          href={`/vendor/invoices/${inv.id}/print`}
                          target="_blank"
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-text-dark"
                        >
                          PDF
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-text-grey">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Invoice #</th>
                  <th className="px-3 py-3.5">Client Details</th>
                  <th className="px-3 py-3.5">Date / Due</th>
                  <th className="px-3 py-3.5 text-right">Amount</th>
                  <th className="px-3 py-3.5 text-right">Balance Due</th>
                  <th className="px-3 py-3.5 text-center">Status</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-text-dark">
                {filteredInvoices.map((inv) => {
                  const overdue = isOverdue(inv);
                  const isBusy = busyInvoiceId === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      {/* Invoice # */}
                      <td className="py-4 pl-6 pr-3 font-semibold">
                        <Link
                          href={`/vendor/invoices/${inv.id}`}
                          className="font-mono text-xs font-bold text-brand-primary hover:underline"
                        >
                          {inv.status === "DRAFT" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-text-grey">
                              {inv.invoiceNumber}
                            </span>
                          ) : (
                            inv.invoiceNumber
                          )}
                        </Link>
                        {inv.isInterState && (
                          <span className="ml-1.5 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                            IGST
                          </span>
                        )}
                      </td>

                      {/* Client */}
                      <td className="px-3 py-4">
                        <div className="font-semibold text-text-dark">
                          {inv.clientName}
                        </div>
                        <div className="text-[11px] text-text-grey">
                          {inv.clientPhone || inv.clientEmail || "—"}
                        </div>
                      </td>

                      {/* Date / Due */}
                      <td className="px-3 py-4">
                        <div className="text-text-dark">{formatDate(inv.issueDate)}</div>
                        {inv.dueDate && (
                          <div
                            className={`text-[11px] ${
                              overdue ? "font-bold text-rose-600" : "text-text-grey"
                            }`}
                          >
                            Due: {formatDate(inv.dueDate)}
                            {overdue && " (Overdue)"}
                          </div>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="px-3 py-4 text-right">
                        <div className="font-bold text-text-dark">
                          {formatINR(inv.grandTotal)}
                        </div>
                        <div className="text-[10px] text-text-grey">
                          Tax: {formatINR(inv.totalTax)}
                        </div>
                      </td>

                      {/* Balance Due */}
                      <td className="px-3 py-4 text-right">
                        <div
                          className={`font-bold ${
                            inv.balanceDue > 0
                              ? overdue
                                ? "text-rose-600"
                                : "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {formatINR(inv.balanceDue)}
                        </div>
                        {inv.paidAmount > 0 && (
                          <div className="text-[10px] text-text-grey">
                            Paid: {formatINR(inv.paidAmount)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            inv.status === "DRAFT"
                              ? "bg-gray-100 text-gray-700"
                              : inv.status === "ISSUED"
                              ? overdue
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                              : inv.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {inv.status === "ISSUED" && overdue
                            ? "OVERDUE"
                            : inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            href={`/vendor/invoices/${inv.id}`}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-text-dark transition hover:bg-gray-50"
                          >
                            View
                          </Link>

                          {inv.status === "DRAFT" && (
                            <>
                              <Link
                                href={`/vendor/invoices/${inv.id}/edit`}
                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-text-dark transition hover:bg-gray-50"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleIssue(inv.id)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Issue
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteDraft(inv.id)}
                                className="rounded-lg p-1 text-text-grey transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                title="Delete draft"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}

                          {inv.status !== "DRAFT" && (
                            <>
                              <Link
                                href={`/vendor/invoices/${inv.id}/print`}
                                target="_blank"
                                className="rounded-lg border border-gray-200 bg-white p-1 text-text-grey transition hover:bg-gray-50 hover:text-text-dark"
                                title="Print / PDF"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </Link>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDuplicate(inv.id)}
                                className="rounded-lg border border-gray-200 bg-white p-1 text-text-grey transition hover:bg-gray-50 hover:text-text-dark disabled:opacity-50"
                                title="Duplicate as new draft"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
