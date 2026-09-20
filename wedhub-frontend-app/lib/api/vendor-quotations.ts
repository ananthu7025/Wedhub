import "server-only";
import { apiFetch } from "./client";
import type {
  LeadQuotationPrefill,
  PublicQuotation,
  QuotationSummaryMetrics,
  VendorQuotation,
  VendorQuotationStatus,
} from "./vendor-quotations.types";

export interface ListQuotationsQuery {
  page?: number;
  limit?: number;
  status?: VendorQuotationStatus | "ALL";
  search?: string;
  leadId?: string;
}

export function listMyQuotations(query: ListQuotationsQuery = {}) {
  return apiFetch<
    VendorQuotation[],
    { page: number; limit: number; total: number; totalPages: number }
  >("/vendor-quotations", {
    query: query as Record<string, string | number | boolean | undefined>,
    cache: "no-store",
  });
}

export function getMyQuotationMetrics() {
  return apiFetch<QuotationSummaryMetrics>("/vendor-quotations/metrics", {
    cache: "no-store",
  });
}

export function getMyQuotation(id: string) {
  return apiFetch<VendorQuotation>(`/vendor-quotations/${id}`, {
    cache: "no-store",
  });
}

export function getLeadQuotationPrefill(leadId: string) {
  return apiFetch<LeadQuotationPrefill>(`/vendor-quotations/prefill/lead/${leadId}`, {
    cache: "no-store",
  });
}

export function getPublicQuotation(token: string) {
  return apiFetch<PublicQuotation>(`/vendor-quotations/public/${token}`, {
    cache: "no-store",
  });
}
