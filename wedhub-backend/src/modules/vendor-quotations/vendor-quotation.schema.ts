import { z } from "zod";
import { VendorQuotationStatus } from "@prisma/client";

export const quotationItemSchema = z.object({
  id: z.string().uuid().optional(),
  packageId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Item name is required").max(255),
  description: z.string().max(2000).nullable().optional(),
  inclusions: z.array(z.string()).default([]),
  quantity: z.number().positive("Quantity must be greater than 0").default(1),
  unit: z.string().max(50).default("Package"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  discount: z.number().min(0).default(0),
});

export const createVendorQuotationSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Title is required").max(255),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be YYYY-MM-DD"),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid until must be YYYY-MM-DD").nullable().optional(),

  eventType: z.string().max(100).default("Wedding"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Event date must be YYYY-MM-DD").nullable().optional(),
  eventLocation: z.string().max(255).nullable().optional(),
  guestCount: z.number().int().min(0).nullable().optional(),

  clientName: z.string().min(1, "Client name is required").max(255),
  clientPhone: z.string().max(30).nullable().optional(),
  clientEmail: z.string().email("Invalid client email").nullable().optional().or(z.literal("")),
  clientAddress: z.string().max(500).nullable().optional(),

  vendorBusinessName: z.string().max(255).optional(),
  vendorCategory: z.string().max(100).nullable().optional(),
  vendorPhone: z.string().max(30).nullable().optional(),
  vendorEmail: z.string().email().nullable().optional().or(z.literal("")),
  vendorAddress: z.string().max(500).nullable().optional(),
  vendorLogoKey: z.string().max(500).nullable().optional(),
  vendorGstin: z.string().max(30).nullable().optional(),
  brandThemeColor: z.string().max(20).default("#E05A47"),

  introduction: z.string().max(5000).nullable().optional(),
  paymentTerms: z.string().max(5000).nullable().optional(),
  terms: z.string().max(10000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),

  currency: z.string().length(3).default("INR"),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),

  items: z.array(quotationItemSchema).min(1, "At least one item or package is required"),
});

export const updateVendorQuotationSchema = createVendorQuotationSchema.partial();

export const listQuotationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.union([z.nativeEnum(VendorQuotationStatus), z.literal("ALL")]).default("ALL"),
  search: z.string().optional(),
  leadId: z.string().uuid().optional(),
});

export const markSentSchema = z.object({
  sentVia: z.enum(["WHATSAPP", "LINK", "PDF", "EMAIL"]).default("WHATSAPP"),
});

export const publicAcceptQuotationSchema = z.object({
  clientNote: z.string().max(1000).optional(),
});

export const publicDeclineQuotationSchema = z.object({
  reason: z.string().max(1000).optional(),
});
