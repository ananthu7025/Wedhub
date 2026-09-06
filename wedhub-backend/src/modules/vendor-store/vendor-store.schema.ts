import { z } from "zod";

const indianPhoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
export const indianPhoneSchema = z.preprocess((val) => {
  if (typeof val === "string") return val.replace(/[\s-]/g, "");
  return val;
}, z.string().regex(indianPhoneRegex, "Must be a valid 10-digit Indian phone number"));

export const storeItemTypeEnum = z.enum([
  "PHYSICAL_PRODUCT",
  "RENTAL_ITEM",
  "DIGITAL_DOWNLOAD",
  "SERVICE_TOKEN",
]);

export const storeOrderStatusEnum = z.enum([
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED_OR_READY",
  "COMPLETED",
  "CANCELLED",
]);

export const gstRateEnum = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(12),
  z.literal(18),
  z.literal(28),
]);

export const storeAccentColorEnum = z.enum([
  "CRIMSON",
  "EMERALD",
  "NAVY",
  "AMBER",
  "PLUM",
  "SLATE",
]);

export const upsertStoreProfileSchema = z.object({
  storeName: z.string().min(1).max(150).optional(),
  tagline: z.string().max(300).nullable().optional(),
  aboutStore: z.string().max(5000).nullable().optional(),
  isEnabled: z.boolean().optional(),
  whatsappOrderPhone: indianPhoneSchema.nullable().optional(),
  shippingPolicy: z.string().max(3000).nullable().optional(),
  returnPolicy: z.string().max(3000).nullable().optional(),
  minOrderValue: z.coerce.number().min(0).nullable().optional(),
  accentColor: storeAccentColorEnum.optional(),
});

export const createStoreItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  itemType: storeItemTypeEnum.default("PHYSICAL_PRODUCT"),
  price: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).nullable().optional(),
  gstRate: gstRateEnum.default(18),
  minOrderQuantity: z.coerce.number().int().min(1).default(1),
  stockQuantity: z.coerce.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().default(true),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  mediaIds: z.array(z.string().uuid()).max(10).optional(),
});

export const updateStoreItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  itemType: storeItemTypeEnum.optional(),
  price: z.coerce.number().min(0).optional(),
  compareAtPrice: z.coerce.number().min(0).nullable().optional(),
  gstRate: gstRateEnum.optional(),
  minOrderQuantity: z.coerce.number().int().min(1).optional(),
  stockQuantity: z.coerce.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  mediaIds: z.array(z.string().uuid()).max(10).optional(),
});

export const publicCreateOrderItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  customizationNotes: z.string().max(500).nullable().optional(),
});

export const storePaymentStatusEnum = z.enum([
  "CREATED",
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CANCELLED",
]);

export const publicCreateOrderSchema = z.object({
  customerName: z.string().min(1).max(150),
  customerPhone: indianPhoneSchema,
  customerEmail: z.string().email().nullable().optional(),
  shippingAddress: z.string().max(1000).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  customerState: z.string().max(100).nullable().optional(),
  pincode: z.string().max(20).nullable().optional(),
  eventDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  paymentMethod: z.enum(["ONLINE", "WHATSAPP"]).default("WHATSAPP"),
  items: z.array(publicCreateOrderItemSchema).min(1).max(50),
});

export const updateOrderStatusSchema = z.object({
  status: storeOrderStatusEnum.optional(),
  paymentStatus: storePaymentStatusEnum.optional(),
});

