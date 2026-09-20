"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { QuotationSummaryMetrics, VendorQuotation } from "@/lib/api/vendor-quotations.types";
import type { InvoiceSummaryMetrics, VendorInvoice } from "@/lib/api/vendor-invoices.types";
import { QuotationsBoard } from "../quotations/QuotationsBoard";
import { InvoicesBoard } from "../invoices/InvoicesBoard";

interface FinancesHubProps {
  initialQuotations: VendorQuotation[];
  quotationMetrics: QuotationSummaryMetrics;
  initialInvoices: VendorInvoice[];
  invoiceMetrics: InvoiceSummaryMetrics | null;
  initialTab?: "quotes" | "invoices";
}

export function FinancesHub({
  initialQuotations,
  quotationMetrics,
  initialInvoices,
  invoiceMetrics,
  initialTab = "quotes",
}: FinancesHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"quotes" | "invoices">(
    queryTab === "invoices" || initialTab === "invoices" ? "invoices" : "quotes",
  );

  function handleTabChange(tab: "quotes" | "invoices") {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/vendor/finances?${params.toString()}`, { scroll: false });
  }

  function formatINR(val: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Quotes & Invoices
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Create branded wedding proposals, collect client acceptances, and issue statutory GST invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/vendor/invoices/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition"
          >
            <svg className="h-3.5 w-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Billing Profile
          </Link>

          <Link
            href="/vendor/invoices/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 transition"
          >
            <svg className="h-3.5 w-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </Link>

          <Link
            href="/vendor/quotations/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover active:scale-[0.98] transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Quotation
          </Link>
        </div>
      </div>

      {/* Unified 5-Stage Financial Pipeline Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Stage 1: Pipeline Quoted */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">1. Total Quoted</span>
            <span className="h-2 w-2 rounded-full bg-neutral-400" />
          </div>
          <p className="mt-1.5 text-xl font-black text-neutral-900">{formatINR(quotationMetrics.totalQuotedValue)}</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">{quotationMetrics.totalCount} proposals sent</p>
        </div>

        {/* Stage 2: Proposals Won */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">2. Quotes Won</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1.5 text-xl font-black text-emerald-600">{formatINR(quotationMetrics.totalAcceptedValue)}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">
            {quotationMetrics.acceptedCount} accepted ({quotationMetrics.conversionRate}% rate)
          </p>
        </div>

        {/* Stage 3: Total Invoiced */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">3. Invoiced</span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <p className="mt-1.5 text-xl font-black text-blue-600">{formatINR(invoiceMetrics?.totalInvoiced ?? 0)}</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">{invoiceMetrics?.counts.all ?? 0} invoices issued</p>
        </div>

        {/* Stage 4: Payments Collected */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">4. Collected</span>
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
          </div>
          <p className="mt-1.5 text-xl font-black text-emerald-700">{formatINR(invoiceMetrics?.totalReceived ?? 0)}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">
            {invoiceMetrics?.counts.paid ?? 0} fully settled
          </p>
        </div>

        {/* Stage 5: Outstanding Balance */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">5. Outstanding</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <p className="mt-1.5 text-xl font-black text-amber-600">
            {formatINR(invoiceMetrics?.outstandingBalance ?? 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            {(invoiceMetrics?.overdueAmount ?? 0) > 0 ? (
              <span className="text-red font-medium">₹{invoiceMetrics?.overdueAmount} overdue</span>
            ) : (
              "Pending collection"
            )}
          </p>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
        <button
          type="button"
          onClick={() => handleTabChange("quotes")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === "quotes"
              ? "bg-neutral-900 text-white shadow-xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={activeTab === "quotes" ? "text-white" : "text-neutral-500"}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="12" y1="17" x2="8" y2="17" />
          </svg>
          <span>Quotations & Proposals</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "quotes" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {quotationMetrics.totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("invoices")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === "invoices"
              ? "bg-neutral-900 text-white shadow-xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={activeTab === "invoices" ? "text-white" : "text-neutral-500"}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <span>Invoices & Payments</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === "invoices" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {invoiceMetrics?.counts.all ?? 0}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "quotes" ? (
        <QuotationsBoard
          initialQuotations={initialQuotations}
          metrics={quotationMetrics}
          hideHeader={true}
        />
      ) : (
        <InvoicesBoard
          initialInvoices={initialInvoices}
          initialMetrics={invoiceMetrics}
          hideHeader={true}
        />
      )}
    </div>
  );
}
