import { z } from "zod";
import { Role } from "../../common/enums/roles.enum";

// A small, deliberately short blocklist of the most commonly breached/guessed
// passwords — not a full breach-corpus lookup (that would need an external
// API call on the login-adjacent register/reset path, out of scope here).
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "qwerty123",
  "letmein123",
  "welcome123",
  "admin1234",
  "iloveyou1",
]);

// RFC 5321 caps a full mailbox at 254 chars and the local part at 64 chars.
// Zod's built-in `.email()` (Zod 3.x) is intentionally permissive (accepts
// some malformed addresses, e.g. consecutive/leading/trailing dots in the
// local part) and has no length bound, so we layer a stricter pattern and
// explicit length caps on top of it rather than relying on it alone.
const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_PART_MAX_LENGTH = 64;
// Local part: alphanumerics plus common separators, no leading/trailing/
// consecutive dots. Domain: at least one label plus a TLD of 2+ letters.
const STRICT_EMAIL_REGEX =
  /^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

// Normalizes (trim + lowercase) BEFORE validating shape, so callers get a
// consistent canonical value in `RegisterBody`/`LoginBody`/etc., matching
// what's stored/looked up via the case-sensitive `User.email` column
// (auth.repository.ts, prisma/schema.prisma). Without this, "Foo@Bar.com"
// and "foo@bar.com" are treated as different accounts.
const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(EMAIL_MAX_LENGTH, "Email is too long")
  .toLowerCase()
  .refine((value) => STRICT_EMAIL_REGEX.test(value), { message: "Invalid email address" })
  .refine((value) => value.split("@")[0]!.length <= EMAIL_LOCAL_PART_MAX_LENGTH, {
    message: "Email is too long",
  });

// Indian mobile numbers only: exactly 10 digits, first digit 6-9 (the only
// range TRAI allocates to mobile subscribers). No country code — this is a
// local-only field, matching the frontend's identical rule (see
// wedhub-frontend-app/lib/validation/auth-schemas.ts), so "+91"/"91"/a
// leading "0" are rejected rather than silently stripped.
const PHONE_REGEX = /^[6-9]\d{9}$/;
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => PHONE_REGEX.test(value), {
    message: "Invalid phone number. Enter a 10-digit Indian mobile number without a country code",
  });

// bcrypt (see password.util.ts) silently truncates its input at 72 BYTES —
// anything beyond that is ignored when hashing, so two different passwords
// sharing the same first 72 bytes would hash identically and both "work".
// We cap well under that (72 chars is always <= 72 bytes for ASCII, but
// multi-byte UTF-8 characters could still exceed 72 bytes at 72 chars) by
// checking actual UTF-8 byte length rather than character length.
const PASSWORD_MAX_BYTES = 72;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((value) => value.trim().length > 0, {
    message: "Password cannot be blank or only whitespace",
  })
  .refine((value) => Buffer.byteLength(value, "utf8") <= PASSWORD_MAX_BYTES, {
    message: `Password must be at most ${PASSWORD_MAX_BYTES} bytes (some characters count as more than one byte)`,
  })
  .refine((value) => /[a-z]/.test(value), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((value) => /[0-9]/.test(value), {
    message: "Password must contain at least one number",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "Password must contain at least one special character",
  })
  .refine((value) => !/(.)\1{3,}/.test(value), {
    message: "Password cannot contain a character repeated 4 or more times in a row",
  })
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "This password is too common. Please choose a stronger password",
  });

// Login only checks presence (the account's real password rules were
// enforced at registration/reset time; changing them later shouldn't lock
// out existing users), but still trims and bounds length defensively.
const loginPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .max(128, "Password is too long")
  .refine((value) => Buffer.byteLength(value, "utf8") <= PASSWORD_MAX_BYTES, {
    message: "Password is too long",
  });

// Login identifier can be an email OR a phone; normalize each the same way
// its dedicated schema would, so lookups in
// authRepository.findUserByEmailOrPhone stay consistent with how
// register()/changeEmail() store values. Also enforces the same shape check
// as the frontend's identifierSchema (auth-schemas.ts) — plain text that is
// neither a valid email nor a valid 10-digit Indian mobile number (e.g.
// "ananthu") is rejected here rather than reaching a doomed database lookup.
const identifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone is required")
  .max(EMAIL_MAX_LENGTH, "Email or phone is too long")
  .transform((value) => (value.includes("@") ? value.toLowerCase() : value.replace(/[\s()-]/g, "")))
  .refine((value) => (value.includes("@") ? STRICT_EMAIL_REGEX.test(value) : PHONE_REGEX.test(value)), {
    message: "Enter a valid email address or phone number",
  });

export const registerSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  role: z.enum([Role.END_USER, Role.VENDOR]),
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: loginPasswordSchema,
});

export const googleLoginSchema = z.object({
  idToken: z.string().trim().min(1, "Google ID token is required"),
  // Optional: present only from /signup, where a role choice already
  // exists; omitted from the plain /login page (see auth.types.ts's
  // GoogleLoginInput doc comment).
  role: z.enum([Role.END_USER, Role.VENDOR]).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  password: passwordSchema,
});

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  currentPassword: z.string().min(1, "Current password is required").max(128, "Current password is too long"),
});

export const confirmEmailChangeSchema = z.object({
  token: z.string().trim().min(1, "Confirmation token is required"),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type GoogleLoginBody = z.infer<typeof googleLoginSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type ChangeEmailBody = z.infer<typeof changeEmailSchema>;
export type ConfirmEmailChangeBody = z.infer<typeof confirmEmailChangeSchema>;
