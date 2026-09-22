import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import type { Role } from "../enums/roles.enum";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  // Mirrors User.emailVerifiedAt at the moment the token was issued (login,
  // refresh, or right after a verify-email/change-email confirmation) so
  // requireVerifiedMiddleware can gate a request without an extra DB read
  // per call. This can go stale for up to the access-token TTL if
  // verification status changes mid-session — acceptable since refresh
  // reissues it from the current DB row every time (see auth.service.ts's
  // refresh()), so staleness never outlives one refresh cycle.
  emailVerified: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const expiresIn = env.JWT_ACCESS_TOKEN_TTL as NonNullable<jwt.SignOptions["expiresIn"]>;
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// "Remember me" multiplies the default refresh-token lifetime rather than
// hardcoding a second env var — keeps the extended TTL proportional to
// whatever JWT_REFRESH_TOKEN_TTL_DAYS is configured as (e.g. 30 -> 90 days).
const REMEMBER_ME_TTL_MULTIPLIER = 3;

export function refreshTokenExpiryDate(rememberMe = false): Date {
  const days = env.JWT_REFRESH_TOKEN_TTL_DAYS * (rememberMe ? REMEMBER_ME_TTL_MULTIPLIER : 1);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
