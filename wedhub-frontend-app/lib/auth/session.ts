import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";
import type { Session, UserRole } from "./types";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Decodes the JWT payload without verifying the signature — safe here because
 * the token only ever arrives via our own httpOnly cookie, set by our own
 * Route Handlers after the backend already validated the credentials. This
 * is an optimistic read for routing/UI decisions; every actual data request
 * still goes through the backend, which re-verifies the token itself.
 */
function decodeAccessToken(token: string): Session | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;
    const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { sub?: string; role?: UserRole; exp?: number };
    if (!payload.sub || !payload.role) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeAccessToken(token);
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/** Only callable from a Route Handler or Server Action — see Next.js cookies() docs. */
export async function setAccessTokenCookie(accessToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    // 15 minutes, matching the backend's JWT_ACCESS_TOKEN_TTL — the refresh
    // flow (lib/auth/dal.ts) re-issues this cookie well before expiry.
    maxAge: 15 * 60,
  });
}

export async function clearAccessTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
