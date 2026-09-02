import { z } from "zod";

export const initiateUpgradeSchema = z.object({
  planId: z.string().uuid(),
  couponCode: z.string().trim().min(1).max(50).optional(),
});

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(1).max(50),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.coerce.number().min(0),
  maxRedemptions: z.coerce.number().int().positive().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

export const refundSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  amountInSmallestUnit: z.coerce.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export type InitiateUpgradeBody = z.infer<typeof initiateUpgradeSchema>;
export type CancelSubscriptionBody = z.infer<typeof cancelSubscriptionSchema>;
export type CreateCouponBody = z.infer<typeof createCouponSchema>;
export type RefundBody = z.infer<typeof refundSchema>;
