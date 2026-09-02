import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * Optimistic, cookie-presence-only gating — this is Proxy (Next.js 16's
 * renamed Middleware, see node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
 * It runs on the edge before any Server Component, so it can only cheaply
 * check whether our session cookie exists — it cannot verify the token
 * against the backend without adding latency to every request. The real
 * enforcement is lib/auth/dal.ts's verifySession()/requireRole(), called
 * from every private layout — see frontenddocs/03-stage-foundation.md.
 */

const roleRoutePrefixes: Record<string, string> = {
  "/couple": "END_USER",
  "/vendor": "VENDOR",
  "/admin": "ADMIN",
};

function decodeRoleFromToken(token: string): string | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;
    const json = atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { role?: string; exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(roleRoutePrefixes).find((prefix) => pathname.startsWith(prefix));

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeRoleFromToken(sessionCookie);
  const requiredRole = roleRoutePrefixes[matchedPrefix];

  if (!role || role !== requiredRole) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/couple/:path*", "/vendor/:path*", "/admin/:path*"],
};
