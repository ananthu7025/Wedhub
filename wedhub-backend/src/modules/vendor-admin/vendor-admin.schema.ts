import { z } from "zod";

export const adminCreateVendorSchema = z.object({
  businessName: z.string().min(1).max(200),
});

export const createInvitationSchema = z.object({
  invitedEmail: z.string().email().optional(),
});

export const adminUpdateVendorSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  cityId: z.string().uuid().optional(),
});

export const setVerificationSchema = z.object({
  verificationLevel: z.enum([
    "UNVERIFIED",
    "IDENTITY_VERIFIED",
    "BUSINESS_VERIFIED",
    "PLATFORM_VERIFIED",
  ]),
});

export const rejectVendorSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const suspendVendorSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const listAdminVendorsQuerySchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "PENDING_VERIFICATION",
      "PENDING_APPROVAL",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
      "DEACTIVATED",
    ])
    .optional(),
  verificationLevel: z
    .enum(["UNVERIFIED", "IDENTITY_VERIFIED", "BUSINESS_VERIFIED", "PLATFORM_VERIFIED"])
    .optional(),
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminCreateVendorBody = z.infer<typeof adminCreateVendorSchema>;
export type CreateInvitationBody = z.infer<typeof createInvitationSchema>;
export type AdminUpdateVendorBody = z.infer<typeof adminUpdateVendorSchema>;
export type SetVerificationBody = z.infer<typeof setVerificationSchema>;
export type RejectVendorBody = z.infer<typeof rejectVendorSchema>;
export type SuspendVendorBody = z.infer<typeof suspendVendorSchema>;
export type ListAdminVendorsQuery = z.infer<typeof listAdminVendorsQuerySchema>;
