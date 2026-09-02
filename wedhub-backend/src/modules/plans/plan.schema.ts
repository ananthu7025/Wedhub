import { z } from "zod";

export const createPlanSchema = z.object({
  tier: z.enum(["FREE", "PRO", "PREMIUM"]),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]),
  name: z.string().trim().min(1).max(100),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).default("INR"),
  trialDays: z.coerce.number().int().min(0).default(0),
  features: z.record(z.string(), z.unknown()).default({}),
  limits: z.record(z.string(), z.unknown()).default({}),
});

export const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  price: z.coerce.number().min(0).optional(),
  trialDays: z.coerce.number().int().min(0).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  limits: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type CreatePlanBody = z.infer<typeof createPlanSchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanSchema>;
