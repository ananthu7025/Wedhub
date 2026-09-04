import { z } from "zod";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const STATE_CODE_REGEX = /^[0-9]{2}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;
const DATE_STRING_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export const ALLOWED_GST_RATES = [0, 5, 12, 18, 28] as const;

export const upsertBillingProfileSchema = z.object({
  legalName: z.string().trim().max(150).nullable().optional(),
  tradeName: z.string().trim().max(150).nullable().optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, "Invalid Indian GSTIN format (e.g. 29ABCDE1234F1Z5)")
    .nullable()
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, "Invalid PAN format (e.g. ABCDE1234F)")
    .nullable()
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  stateCode: z
    .string()
    .trim()
    .regex(STATE_CODE_REGEX, "State code must be 2 digits (e.g. 29 for Karnataka, 32 for Kerala)")
    .nullable()
    .optional()
    .or(z.literal("")),
  pincode: z
    .string()
    .trim()
    .regex(PINCODE_REGEX, "Pincode must be 6 digits")
    .nullable()
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email("Invalid email").nullable().optional().or(z.literal("")),
  bankName: z.string().trim().max(100).nullable().optional(),
  accountName: z.string().trim().max(150).nullable().optional(),
  accountNumber: z.string().trim().max(50).nullable().optional(),
  ifscCode: z.string().trim().toUpperCase().max(20).nullable().optional(),
  upiId: z.string().trim().max(100).nullable().optional(),
  invoicePrefix: z.string().trim().toUpperCase().min(1).max(10).default("INV"),
  defaultNotes: z.string().trim().max(1000).nullable().optional(),
  defaultTerms: z.string().trim().max(2000).nullable().optional(),
});

export const invoiceItemSchema = z
  .object({
    description: z.string().trim().min(1, "Item description is required").max(300),
    sacCode: z.string().trim().max(20).nullable().optional().or(z.literal("")),
    quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    unit: z.string().trim().max(30).default("Session"),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
    discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
    gstRate: z
      .coerce
      .number()
      .refine(
        (val) => ALLOWED_GST_RATES.includes(val as (typeof ALLOWED_GST_RATES)[number]),
        "GST rate must be one of: 0%, 5%, 12%, 18%, 28%",
      ),
  })
  .refine(
    (item) => item.discount <= item.quantity * item.unitPrice,
    "Discount cannot exceed item gross amount (quantity * unit price)",
  );

export const createVendorInvoiceSchema = z
  .object({
    leadId: z.string().uuid("Invalid lead ID").nullable().optional().or(z.literal("")),
    issueDate: z.string().regex(DATE_STRING_REGEX, "Issue date must be a valid date (e.g. YYYY-MM-DD)"),
    dueDate: z
      .string()
      .regex(DATE_STRING_REGEX, "Due date must be a valid date (e.g. YYYY-MM-DD)")
      .nullable()
      .optional()
      .or(z.literal("")),
    clientName: z.string().trim().min(1, "Client name is required").max(150),
    clientPhone: z.string().trim().max(25).nullable().optional(),
    clientEmail: z.string().trim().email("Invalid client email").nullable().optional().or(z.literal("")),
    clientAddress: z.string().trim().max(300).nullable().optional(),
    clientCity: z.string().trim().max(100).nullable().optional(),
    clientState: z.string().trim().max(100).nullable().optional(),
    clientStateCode: z
      .string()
      .trim()
      .regex(STATE_CODE_REGEX, "Client state code must be 2 digits")
      .nullable()
      .optional()
      .or(z.literal("")),
    clientGstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(GSTIN_REGEX, "Invalid client GSTIN")
      .nullable()
      .optional()
      .or(z.literal("")),
    placeOfSupply: z.string().trim().min(1, "Place of supply is required").max(100),
    items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
    notes: z.string().trim().max(1000).nullable().optional(),
    terms: z.string().trim().max(2000).nullable().optional(),
    bankName: z.string().trim().max(100).nullable().optional(),
    accountName: z.string().trim().max(150).nullable().optional(),
    accountNumber: z.string().trim().max(50).nullable().optional(),
    ifscCode: z.string().trim().toUpperCase().max(20).nullable().optional(),
    upiId: z.string().trim().max(100).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.dueDate && data.issueDate) {
        return new Date(data.dueDate) >= new Date(data.issueDate);
      }
      return true;
    },
    { message: "Due date cannot be earlier than issue date", path: ["dueDate"] },
  );

export const updateVendorInvoiceSchema = z
  .object({
    issueDate: z.string().regex(DATE_STRING_REGEX, "Issue date must be a valid date (e.g. YYYY-MM-DD)").optional(),
    dueDate: z
      .string()
      .regex(DATE_STRING_REGEX, "Due date must be a valid date (e.g. YYYY-MM-DD)")
      .nullable()
      .optional()
      .or(z.literal("")),
    clientName: z.string().trim().min(1, "Client name is required").max(150).optional(),
    clientPhone: z.string().trim().max(25).nullable().optional(),
    clientEmail: z.string().trim().email("Invalid client email").nullable().optional().or(z.literal("")),
    clientAddress: z.string().trim().max(300).nullable().optional(),
    clientCity: z.string().trim().max(100).nullable().optional(),
    clientState: z.string().trim().max(100).nullable().optional(),
    clientStateCode: z
      .string()
      .trim()
      .regex(STATE_CODE_REGEX, "Client state code must be 2 digits")
      .nullable()
      .optional()
      .or(z.literal("")),
    clientGstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(GSTIN_REGEX, "Invalid client GSTIN")
      .nullable()
      .optional()
      .or(z.literal("")),
    placeOfSupply: z.string().trim().min(1, "Place of supply is required").max(100).optional(),
    items: z.array(invoiceItemSchema).min(1, "At least one line item is required").optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    terms: z.string().trim().max(2000).nullable().optional(),
    bankName: z.string().trim().max(100).nullable().optional(),
    accountName: z.string().trim().max(150).nullable().optional(),
    accountNumber: z.string().trim().max(50).nullable().optional(),
    ifscCode: z.string().trim().toUpperCase().max(20).nullable().optional(),
    upiId: z.string().trim().max(100).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.dueDate && data.issueDate) {
        return new Date(data.dueDate) >= new Date(data.issueDate);
      }
      return true;
    },
    { message: "Due date cannot be earlier than issue date", path: ["dueDate"] },
  );

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CASH", "CARD", "OTHER"]),
  transactionReference: z.string().trim().max(100).nullable().optional(),
  paymentDate: z.string().regex(DATE_STRING_REGEX, "Payment date must be a valid date").optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
  search: z.string().trim().optional(),
  startDate: z.string().regex(DATE_STRING_REGEX).optional(),
  endDate: z.string().regex(DATE_STRING_REGEX).optional(),
  leadId: z.string().uuid().optional(),
});
