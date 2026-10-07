import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // Loopback-only by default — this server is only ever meant to be reached
  // through Nginx (public API domain) or the Next.js frontend's
  // server-to-server calls, both on the same host. Binding to all
  // interfaces would rely solely on the firewall to keep it private.
  HOST: z.string().default("127.0.0.1"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_ACCESS_TOKEN_TTL: z.string().default("15m"),
  JWT_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),

  MEDIA_MAX_IMAGE_SIZE_MB: z.coerce.number().positive().default(10),
  MEDIA_MAX_VIDEO_SIZE_MB: z.coerce.number().positive().default(100),
  MEDIA_MAX_DOCUMENT_SIZE_MB: z.coerce.number().positive().default(20),

  // ₹49 Instant Wedding Website (Arch Phase 26) — single source of truth
  // for the publish price and the one-time preview's expiry window. See
  // docs/12-stage-wedding-website.md.
  WEDDING_WEBSITE_PRICE_INR: z.coerce.number().positive().default(49),
  WEDDING_WEBSITE_PREVIEW_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  // The public HTTPS URL Telegram should POST updates to, e.g. an ngrok
  // tunnel in dev or the real API domain in production — only needed when
  // actually registering the webhook (registerWebhook.ts), not for
  // receiving/processing updates once it's set.
  API_PUBLIC_URL: z.string().url().optional(),

  // WhatsApp Business Platform Cloud API (Meta direct, no BSP) — see
  // PLAN-2026-09-30-whatsapp-notification-channel.md. Optional, same lazy-
  // gated pattern as every other integration here: the app boots fine
  // unconfigured, whatsapp.client.ts throws ExternalServiceError only when
  // actually invoked without these set.
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_GRAPH_API_VERSION: z.string().default("v21.0"),
  WHATSAPP_DELIVERY_CONCURRENCY: z.coerce.number().int().positive().default(10),
  // Meta/BSP-side outbound rate limit — see the plan's §6. Conservative
  // default (80 messages/minute) until the real account's actual tier
  // limit is confirmed; tune once that's known.
  WHATSAPP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(80),
  WHATSAPP_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  // Vendor bulk-import claim flow (PLAN-2026-09-30-vendor-bulk-import-claim-
  // flow.md) — names of the Meta-approved templates this flow sends.
  // Defaults are placeholders matching the plan's proposed template
  // content; must be updated to the real approved template names before
  // any real send can succeed (whatsapp.client.ts will surface a clear
  // rejection from Meta if a name doesn't match an approved template).
  WHATSAPP_VENDOR_CLAIM_TEMPLATE_NAME: z.string().default("vendor_claim_invite"),
  WHATSAPP_VENDOR_CLAIM_TEMPLATE_LANGUAGE: z.string().default("en"),
  WHATSAPP_OTP_TEMPLATE_NAME: z.string().default("otp_verification"),
  WHATSAPP_OTP_TEMPLATE_LANGUAGE: z.string().default("en"),

  RESEND_API_KEY: z.string().optional(),
  // The domain here must be verified with the email provider (Resend) before
  // sending will actually work — this default is a display placeholder, not
  // a guarantee the domain is set up. Update EMAIL_FROM_ADDRESS in the real
  // environment once itsmykalyanam.com (or a subdomain) is verified there.
  EMAIL_FROM_ADDRESS: z.string().default("itsmyKalyanam <contact@itsmykalyanam.com>"),

  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_URL: z.string().url().default("http://localhost:3001"),

  // Google Sign-In (Identity Services popup flow) — only the Client ID is
  // needed server-side, to verify the `aud` claim on ID tokens the frontend
  // obtains directly from Google. Optional so the rest of the app still
  // boots in environments where this feature isn't configured yet; the
  // /auth/google route itself rejects clearly if this is unset.
  GOOGLE_CLIENT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
