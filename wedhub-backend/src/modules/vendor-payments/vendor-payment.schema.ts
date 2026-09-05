import { z } from "zod";

export const onboardPaymentAccountSchema = z.object({
  legalBusinessName: z.string().min(2).max(150),
  businessType: z.enum(["individual", "proprietorship", "partnership", "private_limited", "public_limited", "llp"]).default("individual"),
  contactEmail: z.string().email(),
  contactPhone: z.string().regex(/^(?:\+91|91)?[6-9]\d{9}$/, "Invalid Indian mobile number"),
  bankName: z.string().min(2).max(100),
  accountNumber: z.string().min(9).max(25).regex(/^\d+$/, "Account number must contain only digits"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g. HDFC0001234)"),
});

export const verifyStoreOrderPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(5),
  razorpayOrderId: z.string().min(5),
  razorpaySignature: z.string().min(10),
});

export const refundStoreOrderSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(250).optional(),
});
