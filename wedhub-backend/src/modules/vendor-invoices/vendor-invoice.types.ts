import type { VendorInvoiceStatus, VendorPaymentMethod } from "@prisma/client";

export interface UpsertBillingProfileInput {
  legalName?: string | null;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  invoicePrefix?: string;
  defaultNotes?: string | null;
  defaultTerms?: string | null;
}

export interface InvoiceItemInput {
  description: string;
  sacCode?: string | null;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
}

export interface CreateVendorInvoiceInput {
  leadId?: string | null;
  issueDate: string; // ISO date string YYYY-MM-DD
  dueDate?: string | null; // ISO date string YYYY-MM-DD
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  clientState?: string | null;
  clientStateCode?: string | null;
  clientGstin?: string | null;
  placeOfSupply: string;
  items: InvoiceItemInput[];
  notes?: string | null;
  terms?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
}

export interface UpdateVendorInvoiceInput {
  issueDate?: string;
  dueDate?: string | null;
  clientName?: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  clientState?: string | null;
  clientStateCode?: string | null;
  clientGstin?: string | null;
  placeOfSupply?: string;
  items?: InvoiceItemInput[];
  notes?: string | null;
  terms?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: VendorPaymentMethod;
  transactionReference?: string | null;
  paymentDate?: string | null; // ISO string
  notes?: string | null;
}

export interface ListInvoicesFilters {
  page?: number;
  limit?: number;
  status?: VendorInvoiceStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  leadId?: string;
}

export interface InvoiceSummaryMetrics {
  totalInvoiced: number;
  totalReceived: number;
  outstandingBalance: number;
  overdueAmount: number;
  counts: {
    all: number;
    draft: number;
    issued: number;
    paid: number;
    cancelled: number;
  };
}
