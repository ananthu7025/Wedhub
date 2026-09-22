import { z } from "zod";
import { FEATURE_CATALOG } from "../entitlements/entitlement.constants";

// Keeps admin-submitted features/limits shaped like FEATURE_CATALOG instead
// of an arbitrary bag of keys — an admin can only set values for features
// that have real enforcement code behind them (see entitlement.constants.ts's
// header comment on why the catalog itself isn't admin-definable).
const limitKeys = FEATURE_CATALOG.filter((f) => f.valueType === "limit").map((f) => f.key);
const booleanKeys = FEATURE_CATALOG.filter((f) => f.valueType === "boolean").map((f) => f.key);

const limitsSchema = z
  .object(Object.fromEntries(limitKeys.map((key) => [key, z.coerce.number().int().min(0).optional()])))
  .partial();

const featuresSchema = z
  .object(Object.fromEntries(booleanKeys.map((key) => [key, z.boolean().optional()])))
  .partial();

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only");

export const createPlanSchema = z.object({
  slug: slugSchema,
  billingInterval: z.enum(["MONTHLY", "YEARLY"]),
  name: z.string().trim().min(1).max(100),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).default("INR"),
  trialDays: z.coerce.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
  features: featuresSchema.default({}),
  limits: limitsSchema.default({}),
});

export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  price: z.coerce.number().min(0).optional(),
  trialDays: z.coerce.number().int().min(0).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isDefault: z.boolean().optional(),
  features: featuresSchema.optional(),
  limits: limitsSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreatePlanBody = z.infer<typeof createPlanSchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanSchema>;
