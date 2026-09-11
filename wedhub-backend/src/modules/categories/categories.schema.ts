import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
  hasStoreEnabled: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  hasStoreEnabled: z.boolean().optional(),
  // Homepage presentation fields — admin-controlled, presentation-only.
  // imageUrl/startingPriceLabel are nullable (not just optional) so an
  // admin can explicitly clear a previously-set value, not just leave it
  // unchanged — same pattern as VendorProfile.logoMediaId/coverMediaId.
  imageUrl: z.string().url().max(2000).nullable().optional(),
  isFeaturedOnHomepage: z.boolean().optional(),
  homepageSortOrder: z.coerce.number().int().optional(),
  startingPriceLabel: z.string().max(60).nullable().optional(),
});

// DROPDOWN, DROPDOWN_RANGE, RADIO and CHECKBOX from the original field-type
// spec are deliberately not separate values here — they're identical in
// storage/validation to SELECT/BOOLEAN (see AttributeDataType in
// schema.prisma) and are reached via `uiVariant` (RADIO) or plain
// option-string content (DROPDOWN_RANGE), not a new enum member.
const attributeDataType = z.enum([
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

const optionsRequiringTypes = new Set(["SELECT", "MULTI_SELECT"]);
const uiVariantValues = z.enum(["RADIO"]);
const aspectRatioValues = z.enum(["1:1", "4:5", "16:9", "3:2"]);

export const createAttributeSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z][a-z0-9_]*$/, "key must be lowercase snake_case"),
    label: z.string().min(1).max(150),
    dataType: attributeDataType,
    options: z.array(z.string().min(1)).min(1).max(50).optional(),
    isFilterable: z.boolean().optional(),
    isComparable: z.boolean().optional(),
    isRequired: z.boolean().optional(),
    placeholder: z.string().max(200).optional(),
    helpText: z.string().max(500).optional(),
    uiVariant: uiVariantValues.optional(),
    aspectRatio: aspectRatioValues.optional(),
  })
  .superRefine((value, ctx) => {
    const requiresOptions = optionsRequiringTypes.has(value.dataType);
    if (requiresOptions && (!value.options || value.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: `options is required when dataType is ${value.dataType}`,
      });
    }
    if (!requiresOptions && value.options) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: `options must not be set when dataType is ${value.dataType}`,
      });
    }
    if (value.uiVariant && value.dataType !== "SELECT") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uiVariant"],
        message: "uiVariant is only valid when dataType is SELECT",
      });
    }
    if (value.aspectRatio && value.dataType !== "IMAGE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aspectRatio"],
        message: "aspectRatio is only valid when dataType is IMAGE",
      });
    }
  });

export const updateAttributeSchema = z.object({
  label: z.string().min(1).max(150).optional(),
  options: z.array(z.string().min(1)).min(1).max(50).optional(),
  isFilterable: z.boolean().optional(),
  isComparable: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  placeholder: z.string().max(200).nullable().optional(),
  helpText: z.string().max(500).nullable().optional(),
  uiVariant: uiVariantValues.nullable().optional(),
  aspectRatio: aspectRatioValues.nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const reorderAttributesSchema = z.object({
  attributeIds: z.array(z.string().uuid()).min(1).max(200),
});

export const createServiceSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CreateAttributeBody = z.infer<typeof createAttributeSchema>;
export type UpdateAttributeBody = z.infer<typeof updateAttributeSchema>;
export type ReorderAttributesBody = z.infer<typeof reorderAttributesSchema>;
export type CreateServiceBody = z.infer<typeof createServiceSchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceSchema>;
