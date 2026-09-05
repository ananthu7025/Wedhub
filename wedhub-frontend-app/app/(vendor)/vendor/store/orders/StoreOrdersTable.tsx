"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createMyStoreOrderInvoice,
  updateMyStoreOrderStatus,
} from "@/lib/api/vendor-store-client";
import type {
  StoreOrderStatus,
  VendorStoreOrder,
} from "@/lib/api/vendor-store.types";

const STATUS_LABELS: Record<StoreOrderStatus, { label: string; color: string }> = {
  PENDING_CONFIRMATION: { label: "Pending Confirmation", color: "bg-amber-50 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-50 text-blue-800 border-blue-200" },
  PROCESSING: { label: "In Preparation", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  SHIPPED_OR_READY: { label: "Dispatched / Ready", color: "bg-purple-50 text-purple-800 border-purple-200" },
  COMPLETED: { label: "Fulfilled & Completed", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  CANCELLED: { label: "Cancelled", color: "bg-neutral-grey-20 text-text-grey border-border" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CAPTURED: { label: "Paid Online", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  PARTIALLY_REFUNDED: { label: "Partially Refunded", color: "bg-amber-100 text-amber-800 border-amber-300" },
  REFUNDED: { label: "Refunded", color: "bg-red-100 text-red-800 border-red-300" },
  PENDING: { label: "Payment Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
  FAILED: { label: "Payment Failed", color: "bg-red-50 text-red-700 border-red-200" },
  CREATED: { label: "Awaiting Payment", color: "bg-surface-input text-text-grey border-border" },
};

export function StoreOrdersTable({
  initialOrders,
}: {
  initialOrders: VendorStoreOrder[];
}) {
  const [orders, setOrders] = useState<VendorStoreOrder[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [invoicingId, setInvoicingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = order.orderNumber.toLowerCase().includes(q);
      const matchName = order.customerName.toLowerCase().includes(q);
      const matchPhone = order.customerPhone.includes(q);
      if (!matchNum && !matchName && !matchPhone) return false;
    }
    return true;
  });

  async function handleStatusChange(orderId: string, newStatus: StoreOrderStatus) {
    setUpdatingId(orderId);
    setErrorMsg(null);
    const res = await updateMyStoreOrderStatus(orderId, { status: newStatus });
    setUpdatingId(null);

    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } else {
      setErrorMsg(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to update order status",
      );
    }
  }

  async function handleCreateInvoice(orderId: string) {
    setInvoicingId(orderId);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await createMyStoreOrderInvoice(orderId);
    setInvoicingId(null);

    if (res.success) {
      const { invoice } = res.data;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                invoiceId: invoice.id,
                invoice: {
                  id: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  status: "DRAFT",
                  grandTotal: invoice.grandTotal,
                },
              }
            : o,
        ),
      );
      setSuccessMsg(
        `GST Invoice #${invoice.invoiceNumber} created successfully! You can view and issue it under Invoices.`,
      );
    } else {
      setErrorMsg(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to generate GST invoice from order",
      );
    }
  }

  return (
    <div className="space-y-5">
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-text-grey"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer or phone…"
              className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs focus:border-brand-primary focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-dark focus:border-brand-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">In Preparation</option>
            <option value="SHIPPED_OR_READY">Dispatched / Ready</option>
            <option value="COMPLETED">Fulfilled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-text-grey">
          Showing <strong>{filteredOrders.length}</strong> order{filteredOrders.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-surface-input flex items-center justify-center text-text-grey mb-3">
            📦
          </div>
          <h3 className="text-sm font-bold text-text-dark">No orders yet</h3>
          <p className="mt-1 text-xs text-text-grey max-w-sm mx-auto">
            {orders.length === 0
              ? "When couples add items to their cart and submit an order from your storefront, they will appear here with WhatsApp chat links and 1-click GST invoice generation."
              : "No orders match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = STATUS_LABELS[order.status] ?? {
              label: order.status,
              color: "bg-surface-input text-text-grey border-border",
            };

            const cleanPhone = order.customerPhone.replace(/\D/g, "");
            const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const waMessage = encodeURIComponent(
              `Hello ${order.customerName}! Thank you for your order #${order.orderNumber} on WedHub. We are confirming the details...`,
            );
            const customerWaUrl = `https://wa.me/${formattedPhone}?text=${waMessage}`;

            return (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-text-dark">
                      #{order.orderNumber}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    {order.paymentStatus && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                          PAYMENT_STATUS_LABELS[order.paymentStatus]?.color ?? "bg-surface-input text-text-grey border-border"
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[order.paymentStatus]?.label ?? order.paymentStatus}
                      </span>
                    )}
                    <span className="text-xs text-text-grey">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-grey font-medium">Update Status:</label>
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as StoreOrderStatus)}
                      className="rounded-md border border-border bg-white px-2 py-1 text-xs text-text-dark focus:border-brand-primary focus:outline-none"
                    >
                      <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PROCESSING">In Preparation</option>
                      <option value="SHIPPED_OR_READY">Dispatched / Ready</option>
                      <option value="COMPLETED">Fulfilled & Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-b border-border">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-grey uppercase tracking-wider mb-1">
                      Customer & Delivery
                    </h4>
                    <div className="font-bold text-sm text-text-dark">{order.customerName}</div>
                    <div className="text-xs text-text-grey mt-0.5">📞 {order.customerPhone}</div>
                    {order.customerEmail && (
                      <div className="text-xs text-text-grey">✉️ {order.customerEmail}</div>
                    )}
                    {order.shippingAddress && (
                      <div className="text-xs text-text-grey mt-1">
                        📍 {order.shippingAddress}, {order.city}, {order.customerState} {order.pincode}
                      </div>
                    )}
                    {order.eventDate && (
                      <div className="mt-1 text-xs font-medium text-purple-700 bg-purple-50 inline-block px-2 py-0.5 rounded border border-purple-200">
                        Event Date: {new Date(order.eventDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </div>
                    )}
                  </div>

                  {/* Order Line Items */}
                  <div className="md:col-span-2">
                    <h4 className="text-xs font-semibold text-text-grey uppercase tracking-wider mb-2">
                      Items Ordered ({order.items.length})
                    </h4>
                    <div className="space-y-1.5">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between text-xs bg-surface-input/50 p-2 rounded-lg"
                        >
                          <div>
                            <span className="font-bold text-text-dark">{item.itemTitle}</span>
                            <span className="text-text-grey ml-1">× {item.quantity}</span>
                            <span className="text-[11px] text-text-grey ml-2">(@ ₹{item.unitPrice} + {item.gstRate}% GST)</span>
                            {item.customizationNotes && (
                              <div className="text-[11px] text-indigo-700 mt-0.5 italic">
                                Note: &quot;{item.customizationNotes}&quot;
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-text-dark whitespace-nowrap">
                            ₹{item.totalPrice.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="mt-2 text-xs text-text-grey bg-surface-input p-2 rounded-lg">
                        <span className="font-semibold text-text-dark">Order Notes: </span>
                        {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-grey">Total Order Amount:</span>
                    <span className="text-base font-bold text-text-dark">
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] rounded bg-surface-input px-1.5 py-0.5 text-text-grey">
                      Channel: {order.orderChannel}
                    </span>
                    {order.razorpayPaymentId && (
                      <Link
                        href="/vendor/store/payments"
                        className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-mono transition-colors"
                      >
                        Tx: {order.razorpayPaymentId}
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={customerWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.476-.15-.676.15-.2.3-.777.978-.952 1.179-.176.2-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.494-.894-.798-1.498-1.783-1.673-2.084-.176-.3-.019-.463.132-.613.136-.134.301-.351.451-.527.151-.176.201-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.633-.927-2.235-.244-.585-.492-.506-.677-.515-.175-.009-.376-.01-.577-.01-.2 0-.526.075-.802.376-.276.3-1.053 1.029-1.053 2.508 0 1.48 1.078 2.909 1.229 3.11.15.2 2.122 3.24 5.141 4.544.718.31 1.278.496 1.716.634.721.229 1.378.196 1.898.119.58-.087 1.78-.727 2.03-1.429.251-.702.251-1.303.176-1.429-.076-.125-.276-.2-.577-.35z" />
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.176L2 22l4.982-1.396C8.423 21.49 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.67 0-3.23-.52-4.52-1.41l-.32-.22-2.96.83.83-2.89-.23-.33C3.84 14.88 3.3 13.48 3.3 12c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z" />
                      </svg>
                      Chat on WhatsApp
                    </a>

                    {order.invoiceId ? (
                      <Link
                        href={`/vendor/invoices/${order.invoiceId}`}
                        className="rounded-lg border border-border bg-surface-input px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-white transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Invoice #{order.invoice?.invoiceNumber ?? "Linked"}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={invoicingId === order.id}
                        onClick={() => handleCreateInvoice(order.id)}
                        className="rounded-lg border border-brand-primary bg-brand-primary/5 px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {invoicingId === order.id ? "Generating Invoice…" : "Create GST Invoice"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
