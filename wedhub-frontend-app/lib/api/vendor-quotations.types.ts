export type VendorQuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface QuotationItem {
  id: string;
  quotationId: string;
  packageId?: string | null;
  itemOrder: number;
  name: string;
  description?: string | null;
  inclusions: string[];
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
}

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

export interface VendorQuotation {
  id: string;
  vendorId: string;
  leadId?: string | null;
  quotationNumber: string;
  viewToken: string;
  status: VendorQuotationStatus;
  title: string;
  issueDate: string;
  validUntil?: string | null;

  // Event Snapshot
  eventType: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  guestCount?: number | null;

  // Client Snapshot
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;

  // Vendor Branding Snapshot
  vendorBusinessName: string;
  vendorCategory?: string | null;
  vendorPhone?: string | null;
  vendorEmail?: string | null;
  vendorAddress?: string | null;
  vendorLogoKey?: string | null;
  vendorGstin?: string | null;
  brandThemeColor?: string;

  // Custom Message & Terms
  introduction?: string | null;
  paymentTerms?: string | null;
  terms?: string | null;
  notes?: string | null;

  // Financials
  currency: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  amountInWords?: string | null;

  // Tracking & Lifecycle
  sentAt?: string | null;
  sentVia?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  convertedToInvoiceId?: string | null;
  convertedToBookingId?: string | null;

  createdAt: string;
  updatedAt: string;

  items: QuotationItem[];
  lead?: {
    id: string;
    status: string;
    enquiry?: {
      weddingDate?: string | null;
      weddingLocation?: string | null;
    };
  } | null;
}

export interface PublicQuotation extends VendorQuotation {
  vendor?: {
    id: string;
    businessName: string;
    slug: string;
    profile?: {
      logoMedia?: {
        thumbnailObjectKey?: string;
        optimizedObjectKey?: string;
        originalObjectKey?: string;
      } | null;
      coverMedia?: {
        thumbnailObjectKey?: string;
        optimizedObjectKey?: string;
        originalObjectKey?: string;
      } | null;
      website?: string | null;
    } | null;
  } | null;
}

export interface CreateVendorQuotationBody {
  leadId?: string | null;
  title: string;
  issueDate: string;
  validUntil?: string | null;

  eventType?: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  guestCount?: number | null;

  clientName: string;
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

  items: QuotationItemInput[];
}

export type UpdateVendorQuotationBody = Partial<CreateVendorQuotationBody>;

export interface QuotationSummaryMetrics {
  totalCount: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  declinedCount: number;
  expiredCount: number;
  totalQuotedValue: number;
  totalAcceptedValue: number;
  conversionRate: number;
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
