"use client";

import type { ApiResponse } from "./types";
import type {
  CreateVendorQuotationBody,
  PublicQuotation,
  UpdateVendorQuotationBody,
  VendorQuotation,
} from "./vendor-quotations.types";

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

export function createMyQuotation(body: CreateVendorQuotationBody) {
  return call<VendorQuotation>("/vendor-quotations", "POST", body);
}

export function updateMyQuotation(id: string, body: UpdateVendorQuotationBody) {
  return call<VendorQuotation>(`/vendor-quotations/${id}`, "PATCH", body);
}

export function deleteMyQuotation(id: string) {
  return call<{ deleted: true }>(`/vendor-quotations/${id}`, "DELETE");
}

export function markMyQuotationSent(id: string, sentVia = "WHATSAPP") {
  return call<VendorQuotation>(`/vendor-quotations/${id}/sent`, "POST", { sentVia });
}

export function duplicateMyQuotation(id: string) {
  return call<VendorQuotation>(`/vendor-quotations/${id}/duplicate`, "POST");
}

export function convertMyQuotationToInvoice(id: string) {
  return call<{
    quotationId: string;
    leadId: string | null;
    clientName: string;
    clientPhone: string | null;
    clientEmail: string | null;
    clientAddress: string | null;
    currency: string;
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discount: number;
      gstRate: number;
      sacCode: string;
      itemOrder: number;
    }>;
  }>(`/vendor-quotations/${id}/convert-invoice`, "POST");
}

export function convertMyQuotationToBooking(id: string) {
  return call<{ id: string }>(`/vendor-quotations/${id}/convert-booking`, "POST");
}

// Public endpoints called by couples
export function publicAcceptQuotationClient(token: string, clientNote?: string) {
  return call<{ success: boolean; quotation: PublicQuotation }>(
    `/vendor-quotations/public/${token}/accept`,
    "POST",
    { clientNote },
  );
}

export function publicDeclineQuotationClient(token: string, reason?: string) {
  return call<{ success: boolean; quotation: PublicQuotation }>(
    `/vendor-quotations/public/${token}/decline`,
    "POST",
    { reason },
  );
}
