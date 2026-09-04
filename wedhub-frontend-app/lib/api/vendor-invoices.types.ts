export type VendorInvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";

export type VendorPaymentMethod =
  | "UPI"
  | "BANK_TRANSFER"
  | "CASH"
  | "CARD"
  | "OTHER";

export interface VendorBillingProfile {
  id: string;
  vendorId: string;
  legalName: string | null;
  tradeName: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  stateCode: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
  invoicePrefix: string;
  defaultNotes: string | null;
  defaultTerms: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInvoiceItem {
  id: string;
  invoiceId: string;
  itemOrder: number;
  description: string;
  sacCode: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

export interface VendorInvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: VendorPaymentMethod;
  transactionReference: string | null;
  paymentDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInvoiceActivity {
  id: string;
  invoiceId: string;
  action: string;
  performedBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface VendorInvoice {
  id: string;
  vendorId: string;
  leadId: string | null;
  invoiceNumber: string;
  status: VendorInvoiceStatus;
  issueDate: string;
  dueDate: string | null;

  // Seller snapshot
  sellerBusinessName: string;
  sellerLegalName: string | null;
  sellerGstin: string | null;
  sellerPan: string | null;
  sellerAddress: string | null;
  sellerCity: string | null;
  sellerState: string | null;
  sellerStateCode: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  sellerLogoKey: string | null;

  // Buyer snapshot
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientState: string | null;
  clientStateCode: string | null;
  clientGstin: string | null;
  placeOfSupply: string;

  // Financial summary
  isInterState: boolean;
  currency: string;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  roundOffAmount: number;
  grandTotal: number;
  amountInWords: string | null;
  paidAmount: number;
  balanceDue: number;

  // Payment details
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
  notes: string | null;
  terms: string | null;

  createdAt: string;
  updatedAt: string;

  items: VendorInvoiceItem[];
  payments: VendorInvoicePayment[];
  activities: VendorInvoiceActivity[];
}

export interface InvoiceItemInput {
  description: string;
  sacCode?: string | null;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  gstRate: number;
}

export interface CreateVendorInvoiceBody {
  leadId?: string | null;
  issueDate: string;
  dueDate?: string | null;
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

export interface UpdateVendorInvoiceBody {
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

export interface UpsertBillingProfileBody {
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

export interface RecordPaymentBody {
  amount: number;
  paymentMethod: VendorPaymentMethod;
  transactionReference?: string | null;
  paymentDate?: string;
  notes?: string | null;
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

export interface LeadPrefillData {
  leadId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  eventDate: string | null;
  eventLocation: string | null;
  budget: number | null;
  notes: string | null;
}
