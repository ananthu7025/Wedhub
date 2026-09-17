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

export const googleLoginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.LOGIN_RATE_LIMIT_MAX ? Number(process.env.LOGIN_RATE_LIMIT_MAX) : 10,
  message: "Too many sign-in attempts. Please try again later.",
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

// Authenticated resend, but still capped — otherwise a "Resend email" button
// left un-throttled on the client becomes a way to spam one inbox.
export const resendVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX ? Number(process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX) : 5,
  message: "Too many verification email requests. Please try again later.",
});

// Same shape as forgotPasswordRateLimiter — a security-relevant action that
// also emails an address the caller doesn't necessarily control yet.
export const changeEmailRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: process.env.CHANGE_EMAIL_RATE_LIMIT_MAX ? Number(process.env.CHANGE_EMAIL_RATE_LIMIT_MAX) : 5,
  message: "Too many email change requests. Please try again later.",
});

// Vendor-creation is a one-time-per-user action, same abuse shape as
// registration (scripted account/listing farming), so it mirrors
// registerRateLimiter's window/default rather than a generic per-minute cap.
export const vendorCreateRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: process.env.VENDOR_CREATE_RATE_LIMIT_MAX ? Number(process.env.VENDOR_CREATE_RATE_LIMIT_MAX) : 20,
  message: "Too many vendor listing creation attempts. Please try again later.",
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

// Stage 13 / Arch Phase 30 — public store payment signature verification
export const storePaymentVerifyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.STORE_PAYMENT_VERIFY_RATE_LIMIT_MAX ? Number(process.env.STORE_PAYMENT_VERIFY_RATE_LIMIT_MAX) : 15,
  message: "Too many payment verification attempts. Please try again later.",
});

// Contest voting — authenticated, must resist scripted vote-buying while not
// blocking a real user browsing/voting on a few entries per visit.
export const challengeVoteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: process.env.CHALLENGE_VOTE_RATE_LIMIT_MAX ? Number(process.env.CHALLENGE_VOTE_RATE_LIMIT_MAX) : 10,
  message: "Too many votes submitted. Please slow down.",
});

// Contest entry submission — a vendor submitting many entries in a short
// burst is itself a fraud signal, so this is deliberately tighter than the
// generic enquiry/review limiters above.
export const challengeEntryRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: process.env.CHALLENGE_ENTRY_RATE_LIMIT_MAX ? Number(process.env.CHALLENGE_ENTRY_RATE_LIMIT_MAX) : 5,
  message: "Too many challenge entries submitted. Please try again tomorrow.",
});

// Couples-only community feature — posting is throttled like reviews
// (an intentional, considered action), while voting/commenting are cheap,
// high-frequency browsing actions that need a looser cap, same reasoning as
// challengeVoteRateLimiter vs challengeEntryRateLimiter above.
export const communityPostRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: process.env.COMMUNITY_POST_RATE_LIMIT_MAX ? Number(process.env.COMMUNITY_POST_RATE_LIMIT_MAX) : 10,
  message: "Too many posts submitted. Please try again later.",
});

export const communityVoteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: process.env.COMMUNITY_VOTE_RATE_LIMIT_MAX ? Number(process.env.COMMUNITY_VOTE_RATE_LIMIT_MAX) : 30,
  message: "Too many votes submitted. Please slow down.",
});

export const communityCommentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: process.env.COMMUNITY_COMMENT_RATE_LIMIT_MAX ? Number(process.env.COMMUNITY_COMMENT_RATE_LIMIT_MAX) : 20,
  message: "Too many comments submitted. Please slow down.",
});

