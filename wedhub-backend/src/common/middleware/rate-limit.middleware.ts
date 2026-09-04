import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { errorResponse } from "../utils/api-response.util";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

export function createRateLimiter(options: RateLimitOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(errorResponse("RATE_LIMIT_EXCEEDED", options.message));
    },
  });
}

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.LOGIN_RATE_LIMIT_MAX ? Number(process.env.LOGIN_RATE_LIMIT_MAX) : 10,
  message: "Too many login attempts. Please try again later.",
});

export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please try again later.",
});

export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: process.env.REGISTER_RATE_LIMIT_MAX ? Number(process.env.REGISTER_RATE_LIMIT_MAX) : 20,
  message: "Too many registration attempts. Please try again later.",
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many search requests. Please slow down.",
});

export const enquiryRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.ENQUIRY_RATE_LIMIT_MAX ? Number(process.env.ENQUIRY_RATE_LIMIT_MAX) : 10,
  message: "Too many enquiries submitted. Please try again later.",
});

export const reviewRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: process.env.REVIEW_RATE_LIMIT_MAX ? Number(process.env.REVIEW_RATE_LIMIT_MAX) : 5,
  message: "Too many reviews submitted. Please try again later.",
});

// Arch Phase 18 Stage A — public, unauthenticated, high-frequency-by-design
// (page views, vendor impressions/clicks, filter changes can all fire many
// times per minute during normal browsing). Generous on purpose: this must
// not throttle a real user's normal session, only bulk abuse/scripted spam.
export const analyticsEventRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: process.env.ANALYTICS_EVENT_RATE_LIMIT_MAX ? Number(process.env.ANALYTICS_EVENT_RATE_LIMIT_MAX) : 120,
  message: "Too many analytics events. Please slow down.",
});

// Stage 11 / Arch Phase 29 — public, unauthenticated store order submission
export const storeOrderRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.STORE_ORDER_RATE_LIMIT_MAX ? Number(process.env.STORE_ORDER_RATE_LIMIT_MAX) : 10,
  message: "Too many store order attempts. Please try again later.",
});
