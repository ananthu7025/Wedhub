import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

const attributeDataType = z.enum(["BOOLEAN", "NUMBER", "TEXT", "SELECT", "MULTI_SELECT"]);

const optionsRequiringTypes = new Set(["SELECT", "MULTI_SELECT"]);

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
  });

export const updateAttributeSchema = z.object({
  label: z.string().min(1).max(150).optional(),
  options: z.array(z.string().min(1)).min(1).max(50).optional(),
  isFilterable: z.boolean().optional(),
  isComparable: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CreateAttributeBody = z.infer<typeof createAttributeSchema>;
export type UpdateAttributeBody = z.infer<typeof updateAttributeSchema>;
