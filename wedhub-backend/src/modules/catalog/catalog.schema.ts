import { z } from "zod";

export const attributeDataTypeEnum = z.enum([
  "BOOLEAN",
  "NUMBER",
  "TEXT",
  "SELECT",
  "MULTI_SELECT",
  "TEXTAREA",
  "NUMBER_RANGE",
  "IMAGE",
  "PHONE",
  "URL",
  "EMAIL",
  "TIME",
  "TIME_RANGE",
]);

export const catalogAvailabilityStatusEnum = z.enum(["BOOKED", "BLOCKED"]);

// ---- Vendor: catalog items ----

export const createCatalogItemVariantSchema = z.object({
  attributes: z.record(z.string(), z.unknown()).default({}),
  price: z.coerce.number().min(0),
  sku: z.string().max(100).nullable().optional(),
  stockQuantity: z.coerce.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().default(true),
});

export const createCatalogItemComponentSchema = z.object({
  name: z.string().min(1).max(150),
  defaultQty: z.coerce.number().int().min(0).default(1),
  minQty: z.coerce.number().int().min(0).default(0),
  maxQty: z.coerce.number().int().min(0).nullable().optional(),
  unitPrice: z.coerce.number().min(0).nullable().optional(),
  isRequired: z.boolean().default(false),
});

export const createCatalogItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  basePrice: z.coerce.number().min(0).nullable().optional(),
  isCustomizable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  mediaIds: z.array(z.string().uuid()).max(10).optional(),
  variants: z.array(createCatalogItemVariantSchema).max(100).optional(),
  components: z.array(createCatalogItemComponentSchema).max(50).optional(),
});

export const updateCatalogItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  basePrice: z.coerce.number().min(0).nullable().optional(),
  isCustomizable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  mediaIds: z.array(z.string().uuid()).max(10).optional(),
  variants: z.array(createCatalogItemVariantSchema).max(100).optional(),
  components: z.array(createCatalogItemComponentSchema).max(50).optional(),
});

export const setAvailabilitySchema = z.object({
  variantId: z.string().uuid().nullable().optional(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD")).min(1).max(366),
  status: catalogAvailabilityStatusEnum.default("BOOKED"),
  note: z.string().max(300).nullable().optional(),
});

export const clearAvailabilitySchema = z.object({
  variantId: z.string().uuid().nullable().optional(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD")).min(1).max(366),
});

// ---- Admin: per-category variant field configuration ----

export const upsertCatalogVariantFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z][a-zA-Z0-9]*$/, "Key must be a single camelCase identifier"),
  label: z.string().min(1).max(150),
  dataType: attributeDataTypeEnum,
  options: z.unknown().nullable().optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

export const reorderCatalogVariantFieldsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

// ---- Vendor: CSV bulk import ----
// The CSV arrives as a JSON string field, not a multipart file upload — the
// frontend reads the selected file client-side via File.text() and sends it
// through the same generic JSON proxy every other authenticated call uses.
// Avoids adding multer/multipart handling to an app that is JSON-only
// everywhere else, and avoids the frontend's generic proxy (which forwards
// request.text()) mangling a multipart body it was never designed to relay.
export const importCatalogItemsSchema = z.object({
  csvContent: z.string().min(1).max(2_000_000), // ~2MB of CSV text
});

export type CreateCatalogItemInput = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type ClearAvailabilityInput = z.infer<typeof clearAvailabilitySchema>;
export type UpsertCatalogVariantFieldInput = z.infer<typeof upsertCatalogVariantFieldSchema>;
export type ReorderCatalogVariantFieldsInput = z.infer<typeof reorderCatalogVariantFieldsSchema>;
export type ImportCatalogItemsInput = z.infer<typeof importCatalogItemsSchema>;
