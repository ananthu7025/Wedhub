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

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), {
    message: "Password must contain at least one letter and one number",
  })
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "This password is too common. Please choose a stronger password",
  });

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6).max(20).optional(),
  password: passwordSchema,
  role: z.enum([Role.END_USER, Role.VENDOR]),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
  // Optional: present only from /signup, where a role choice already
  // exists; omitted from the plain /login page (see auth.types.ts's
  // GoogleLoginInput doc comment).
  role: z.enum([Role.END_USER, Role.VENDOR]).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type GoogleLoginBody = z.infer<typeof googleLoginSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
