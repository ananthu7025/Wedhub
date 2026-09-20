import type { VendorQuotationStatus } from "@prisma/client";

export interface QuotationItemInput {
  id?: string;
  packageId?: string | null;
  name: string;
  description?: string | null;
  inclusions?: string[];
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
}

export interface CreateVendorQuotationInput {
  leadId?: string | null;
  title: string;
  issueDate: string; // ISO date YYYY-MM-DD
  validUntil?: string | null;

  // Event
  eventType?: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  guestCount?: number | null;

  // Client
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;

  // Branding overrides (optional, defaults to vendor profile)
  vendorBusinessName?: string;
  vendorCategory?: string | null;
  vendorPhone?: string | null;
  vendorEmail?: string | null;
  vendorAddress?: string | null;
  vendorLogoKey?: string | null;
  vendorGstin?: string | null;
  brandThemeColor?: string;

  // Message & Terms
  introduction?: string | null;
  paymentTerms?: string | null;
  terms?: string | null;
  notes?: string | null;

  // Financials
  currency?: string;
  discount?: number;
  taxRate?: number;

  // Items
  items: QuotationItemInput[];
}

export interface UpdateVendorQuotationInput {
  leadId?: string | null;
  title?: string;
  issueDate?: string;
  validUntil?: string | null;

  eventType?: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  guestCount?: number | null;

  clientName?: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;

  vendorBusinessName?: string;
  vendorCategory?: string | null;
  vendorPhone?: string | null;
  vendorEmail?: string | null;
  vendorAddress?: string | null;
  vendorLogoKey?: string | null;
  vendorGstin?: string | null;
  brandThemeColor?: string;

  introduction?: string | null;
  paymentTerms?: string | null;
  terms?: string | null;
  notes?: string | null;

  currency?: string;
  discount?: number;
  taxRate?: number;

  items?: QuotationItemInput[];
}

export interface ListQuotationsFilters {
  page?: number;
  limit?: number;
  status?: VendorQuotationStatus | "ALL";
  search?: string;
  leadId?: string;
}

export interface QuotationSummaryMetrics {
  totalCount: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  declinedCount: number;
  expiredCount: number;
  totalQuotedValue: number;
  totalAcceptedValue: number;
  conversionRate: number; // percentage
}

export interface LeadQuotationPrefill {
  leadId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  eventDate: string | null;
  eventLocation: string | null;
  guestCount: number | null;
  budget: number | null;
  notes: string | null;
}
