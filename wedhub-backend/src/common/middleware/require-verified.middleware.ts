import type { NextFunction, Request, Response } from "express";
import { AuthenticationError, EmailNotVerifiedError } from "../errors";

// Gates a route behind email verification — for "reaching profile setup"
// only (item 1 of the 2026-09-16 request), not for the whole app. Must run
// after authenticateMiddleware, which is what populates req.user.emailVerified
// from the access token's emailVerified claim (see token.util.ts).
//
// This deliberately does NOT touch vendor.service.ts's existing
// PENDING_VERIFICATION -> PENDING_APPROVAL listing-status progression — that
// is a separate, already-correct concern (whether a vendor's public listing
// advances for admin review), not an app-access gate. This middleware is
// about blocking mutating profile-setup endpoints themselves.
export function requireVerifiedMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AuthenticationError());
    return;
  }

  if (!req.user.emailVerified) {
    next(new EmailNotVerifiedError());
    return;
  }

  next();
}

// Same email-verified gate, but for routes mounted behind
// optionalAuthenticateMiddleware instead of authenticateMiddleware (e.g.
// enquiry.routes.ts, which product.md's "Get Quote" flow requires to keep
// working for anonymous visitors). Anonymous requests (no req.user at all)
// are waved through unchanged — there is no verification state to gate for
// a visitor who was never asked to log in — while a request that DID attach
// a user (a logged-in, unverified account) is blocked exactly like
// requireVerifiedMiddleware above. This only widens who is EXEMPT from the
// check; a logged-in unverified user is never treated as anonymous.
export function requireVerifiedIfAuthenticatedMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next();
    return;
  }

  if (!req.user.emailVerified) {
    next(new EmailNotVerifiedError());
    return;
  }

  next();
}
