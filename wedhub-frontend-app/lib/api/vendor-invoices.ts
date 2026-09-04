import "server-only";
import { apiFetch } from "./client";
import type {
  InvoiceSummaryMetrics,
  LeadPrefillData,
  VendorBillingProfile,
  VendorInvoice,
  VendorInvoiceStatus,
} from "./vendor-invoices.types";

export interface ListInvoicesQuery {
  page?: number;
  limit?: number;
  status?: VendorInvoiceStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  leadId?: string;
}

export function getMyBillingProfile() {
  return apiFetch<VendorBillingProfile>("/vendor-invoices/billing-profile");
}

export function listMyInvoices(query: ListInvoicesQuery = {}) {
  return apiFetch<
    VendorInvoice[],
    { page: number; limit: number; total: number; totalPages: number }
  >("/vendor-invoices", {
    query: query as Record<string, string | number | boolean | undefined>,
    cache: "no-store",
  });
}

export function getMyInvoiceMetrics() {
  return apiFetch<InvoiceSummaryMetrics>("/vendor-invoices/metrics", {
    cache: "no-store",
  });
}

export function getMyInvoice(id: string) {
  return apiFetch<VendorInvoice>(`/vendor-invoices/${id}`, {
    cache: "no-store",
  });
}

export function getLeadPrefill(leadId: string) {
  return apiFetch<LeadPrefillData>(`/vendor-invoices/prefill/lead/${leadId}`, {
    cache: "no-store",
  });
}
