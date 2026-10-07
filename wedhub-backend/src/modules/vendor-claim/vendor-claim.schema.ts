import { z } from "zod";
import { Role } from "../../common/enums/roles.enum";

export const claimRegisterSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(6).max(20).optional(),
});

export const claimLinkSchema = z.object({
  token: z.string().min(1),
});

export const sendClaimOtpSchema = z.object({
  token: z.string().min(1),
});

export const verifyClaimOtpSchema = z.object({
  token: z.string().min(1),
  code: z.string().length(6),
});

export type ClaimRegisterBody = z.infer<typeof claimRegisterSchema>;
export type ClaimLinkBody = z.infer<typeof claimLinkSchema>;
export type SendClaimOtpBody = z.infer<typeof sendClaimOtpSchema>;
export type VerifyClaimOtpBody = z.infer<typeof verifyClaimOtpSchema>;

// Only used internally to confirm the claiming user's role is VENDOR-compatible.
export const CLAIMABLE_ROLE = Role.VENDOR;
