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
