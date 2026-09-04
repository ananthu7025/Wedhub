"use client";

import type { ApiResponse } from "./types";
import type {
  CreateVendorInvoiceBody,
  RecordPaymentBody,
  UpdateVendorInvoiceBody,
  UpsertBillingProfileBody,
  VendorBillingProfile,
  VendorInvoice,
} from "./vendor-invoices.types";

async function call<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function upsertMyBillingProfile(body: UpsertBillingProfileBody) {
  return call<VendorBillingProfile>("/vendor-invoices/billing-profile", "PUT", body);
}

export function createMyInvoice(body: CreateVendorInvoiceBody) {
  return call<VendorInvoice>("/vendor-invoices", "POST", body);
}

export function updateMyInvoice(id: string, body: UpdateVendorInvoiceBody) {
  return call<VendorInvoice>(`/vendor-invoices/${id}`, "PATCH", body);
}

export function deleteMyInvoice(id: string) {
  return call<{ success: boolean }>(`/vendor-invoices/${id}`, "DELETE");
}

export function issueMyInvoice(id: string) {
  return call<VendorInvoice>(`/vendor-invoices/${id}/issue`, "POST");
}

export function cancelMyInvoice(id: string, reason?: string) {
  return call<VendorInvoice>(`/vendor-invoices/${id}/cancel`, "POST", { reason });
}

export function duplicateMyInvoice(id: string) {
  return call<VendorInvoice>(`/vendor-invoices/${id}/duplicate`, "POST");
}

export function recordMyInvoicePayment(id: string, body: RecordPaymentBody) {
  return call<VendorInvoice>(`/vendor-invoices/${id}/payments`, "POST", body);
}

export function deleteMyInvoicePayment(id: string, paymentId: string) {
  return call<VendorInvoice>(`/vendor-invoices/${id}/payments/${paymentId}`, "DELETE");
}
