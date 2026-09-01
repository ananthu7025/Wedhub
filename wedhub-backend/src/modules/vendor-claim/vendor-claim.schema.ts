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

export type ClaimRegisterBody = z.infer<typeof claimRegisterSchema>;
export type ClaimLinkBody = z.infer<typeof claimLinkSchema>;

// Only used internally to confirm the claiming user's role is VENDOR-compatible.
export const CLAIMABLE_ROLE = Role.VENDOR;
