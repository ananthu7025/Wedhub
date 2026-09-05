"use client";

import { useState } from "react";
import type {
  VendorPaymentAccountSummary,
  VendorStoreOrder,
} from "@/lib/api/vendor-store.types";
import type { AdminStorePaymentMetrics } from "@/lib/api/vendor-payments-client";

export function AdminStorePaymentsBoard({
  initialMetrics,
  initialAccounts,
  initialOrders,
}: {
  initialMetrics: AdminStorePaymentMetrics | null;
  initialAccounts: VendorPaymentAccountSummary[];
  initialOrders: VendorStoreOrder[];
}) {
  const [activeTab, setActiveTab] = useState<"accounts" | "orders">("orders");
  const [accountSearch, setAccountSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");

  const filteredAccounts = initialAccounts.filter((acc) => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    return (
      acc.legalBusinessName.toLowerCase().includes(q) ||
      acc.bankName.toLowerCase().includes(q) ||
      acc.ifscCode.toLowerCase().includes(q) ||
      acc.contactEmail.toLowerCase().includes(q)
    );
  });

  const filteredOrders = initialOrders.filter((ord) => {
    if (paymentStatusFilter !== "ALL" && ord.paymentStatus !== paymentStatusFilter) return false;
    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      (ord.razorpayPaymentId?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-dark">Marketplace Payments & Route Settlements</h1>
        <p className="mt-1 text-sm text-text-grey">
          Monitor multi-vendor payments, linked bank accounts, and direct split transfers via Razorpay Route.
        </p>
      </div>

      {/* Global Financial Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-text-grey uppercase tracking-wider">
            Total Marketplace GMV
          </div>
          <div className="mt-2 text-2xl font-black text-text-dark">
            ₹{(initialMetrics?.totalGmv ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[11px] text-text-grey">
            Across {initialMetrics?.totalPaidOrders ?? 0} paid store orders
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-text-grey uppercase tracking-wider">
            Total Refunded
          </div>
          <div className="mt-2 text-2xl font-black text-red-600">
            ₹{(initialMetrics?.totalRefundsAmount ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[11px] text-red-700 font-semibold">
            Across all marketplace orders
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-text-grey uppercase tracking-wider">
            Active Connected Vendors
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600">
            {initialMetrics?.activeAccountsCount ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-purple-700">
            Enabled for direct checkout, of {initialMetrics?.totalAccounts ?? 0} total
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-text-grey uppercase tracking-wider">
            Platform Commission
          </div>
          <div className="mt-2 text-2xl font-black text-brand-primary">
            ₹{(initialMetrics?.totalPlatformCommission ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[11px] text-brand-primary font-bold">
            Zero-commission policy
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "orders"
              ? "border-brand-primary text-brand-primary font-bold"
              : "border-transparent text-text-grey hover:text-text-dark"
          }`}
        >
          <span>Marketplace Orders & Settlements</span>
          <span className="text-xs bg-surface-input px-2 py-0.5 rounded-full font-semibold">
            {initialOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "accounts"
              ? "border-brand-primary text-brand-primary font-bold"
              : "border-transparent text-text-grey hover:text-text-dark"
          }`}
        >
          <span>Connected Vendor Bank Accounts</span>
          <span className="text-xs bg-surface-input px-2 py-0.5 rounded-full font-semibold">
            {initialAccounts.length}
          </span>
        </button>
      </div>

      {activeTab === "orders" ? (
        /* Orders Ledger Tab */
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order #, customer, tx ID..."
                className="w-full rounded-xl border border-border px-3.5 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-text-grey">Payment:</span>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="rounded-xl border border-border px-3 py-1.5 text-xs focus:border-brand-primary focus:outline-none bg-white"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="CAPTURED">Paid Online (Captured)</option>
                <option value="PENDING">Pending Payment</option>
                <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                <option value="REFUNDED">Refunded</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-input/50 text-[11px] font-bold uppercase text-text-grey">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Vendor Settlement</th>
                  <th className="py-3 px-3">Payment Status</th>
                  <th className="py-3 px-3">Gateway Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-grey">
                      No marketplace orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-surface-input/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-primary">
                        #{ord.orderNumber}
                      </td>
                      <td className="py-3 px-3 text-text-grey">
                        {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text-dark">{ord.customerName}</div>
                        <div className="text-[11px] text-text-grey">{ord.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-text-dark">
                        ₹{ord.totalAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-600">
                        ₹{(ord.vendorSettlementAmount ?? ord.totalAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3">
                        {ord.paymentStatus === "CAPTURED" && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                            CAPTURED
                          </span>
                        )}
                        {ord.paymentStatus === "PARTIALLY_REFUNDED" && (
                          <span className="rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[10px]">
                            PARTIAL REFUND
                          </span>
                        )}
                        {ord.paymentStatus === "REFUNDED" && (
                          <span className="rounded-full bg-red-100 text-red-800 font-bold px-2 py-0.5 text-[10px]">
                            REFUNDED
                          </span>
                        )}
                        {ord.paymentStatus === "PENDING" && (
                          <span className="rounded-full bg-amber-50 text-amber-700 font-bold px-2 py-0.5 text-[10px]">
                            PENDING
                          </span>
                        )}
                        {ord.paymentStatus === "FAILED" && (
                          <span className="rounded-full bg-red-50 text-red-700 font-bold px-2 py-0.5 text-[10px]">
                            FAILED
                          </span>
                        )}
                        {ord.paymentStatus === "CREATED" && (
                          <span className="rounded-full bg-surface-input text-text-grey font-bold px-2 py-0.5 text-[10px]">
                            CREATED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-text-grey">
                        {ord.razorpayPaymentId ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Connected Accounts Tab */
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-4">
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              placeholder="Search by legal name, bank, IFSC..."
              className="w-full rounded-xl border border-border px-3.5 py-1.5 text-xs focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-input/50 text-[11px] font-bold uppercase text-text-grey">
                <tr>
                  <th className="py-3 px-3">Legal Business Entity</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Bank Details</th>
                  <th className="py-3 px-3">IFSC Code</th>
                  <th className="py-3 px-3">Route Account ID</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Linked Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-grey">
                      No connected vendor bank accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-surface-input/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-text-dark">{acc.legalBusinessName}</div>
                        <div className="text-[11px] text-text-grey">{acc.contactEmail}</div>
                      </td>
                      <td className="py-3 px-3 capitalize text-text-grey">
                        {acc.businessType}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text-dark">{acc.bankName}</div>
                        <div className="font-mono text-[11px] text-text-grey">{acc.accountNumberMasked}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-text-dark">
                        {acc.ifscCode}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-text-grey">
                        {acc.razorpayAccountId ?? "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-grey">
                        {new Date(acc.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
