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
  max: 10,
  message: "Too many login attempts. Please try again later.",
});

export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please try again later.",
});

export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many registration attempts. Please try again later.",
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many search requests. Please slow down.",
});

export const enquiryRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many enquiries submitted. Please try again later.",
});

export const reviewRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many reviews submitted. Please try again later.",
});
