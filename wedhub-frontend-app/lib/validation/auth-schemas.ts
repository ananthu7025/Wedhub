import { z } from "zod";

/**
 * Client-side mirror of wedhub-backend's src/modules/auth/auth.schema.ts.
 *
 * Kept intentionally in lock-step with the backend rules so a user never
 * passes client-side validation only to be rejected by the server (or vice
 * versa). The backend remains the source of truth and re-validates
 * everything independently — this only gives instant, field-level feedback
 * before a request is ever sent.
 */

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

const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_PART_MAX_LENGTH = 64;
const STRICT_EMAIL_REGEX =
  /^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(EMAIL_MAX_LENGTH, "Email is too long")
  .toLowerCase()
  .refine((value) => STRICT_EMAIL_REGEX.test(value), { message: "Enter a valid email address" })
  .refine((value) => value.split("@")[0]!.length <= EMAIL_LOCAL_PART_MAX_LENGTH, {
    message: "Email is too long",
  });

// Indian mobile numbers only: exactly 10 digits, first digit 6-9 (the only
// range TRAI allocates to mobile subscribers). No country code — this is a
// local-only field, so "+91"/"91"/leading "0" are not accepted at all.
const INDIA_PHONE_REGEX = /^[6-9]\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => INDIA_PHONE_REGEX.test(value), {
    message: "Enter a valid 10-digit Indian mobile number",
  });

// Optional phone: empty string is allowed (field is optional on the form),
// anything non-empty must be a valid Indian mobile number.
export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => value.length === 0 || INDIA_PHONE_REGEX.test(value), {
    message: "Enter a valid 10-digit Indian mobile number",
  });

const PASSWORD_MAX_BYTES = 72;

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128, "At most 128 characters")
  .refine((value) => value.trim().length > 0, { message: "Password cannot be blank" })
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    message: `At most ${PASSWORD_MAX_BYTES} bytes (some characters count as more than one byte)`,
  })
  .refine((value) => /[a-z]/.test(value), { message: "At least one lowercase letter" })
  .refine((value) => /[A-Z]/.test(value), { message: "At least one uppercase letter" })
  .refine((value) => /[0-9]/.test(value), { message: "At least one number" })
  .refine((value) => /[^A-Za-z0-9]/.test(value), { message: "At least one special character" })
  .refine((value) => !/(.)\1{3,}/.test(value), {
    message: "No character repeated 4+ times in a row",
  })
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "This password is too common",
  });

export const loginPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .max(128, "Password is too long")
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    message: "Password is too long",
  });

// Login identifier can be an email OR a phone. Mirrors the backend's
// identifierSchema (auth.schema.ts): if it contains "@" it must be a valid
// email shape, otherwise it must be a valid phone shape — plain text like
// "ananthu" is neither and must be rejected here, not just by the server.
export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone is required")
  .max(EMAIL_MAX_LENGTH, "Too long")
  .refine(
    (value) => {
      if (value.includes("@")) {
        return STRICT_EMAIL_REGEX.test(value.toLowerCase());
      }
      return INDIA_PHONE_REGEX.test(value.replace(/[\s()-]/g, ""));
    },
    { message: "Enter a valid email address or phone number" },
  );

export const registerFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginFormSchema = z.object({
  identifier: identifierSchema,
  password: loginPasswordSchema,
});

export const forgotPasswordFormSchema = z.object({
  email: emailSchema,
});

export const resetPasswordFormSchema = z.object({
  password: passwordSchema,
});

/**
 * Validates a single field's raw value against a Zod schema and returns the
 * first error message, or null if valid. Built for per-field, on-change
 * validation rather than whole-form submission.
 */
export function validateField(schema: z.ZodTypeAny, value: string): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid value";
}
