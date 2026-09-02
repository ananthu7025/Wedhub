import "server-only";
import type { ApiResponse } from "@/lib/api/types";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Raw, unauthenticated fetch straight to the backend's /api/v1/auth/* endpoints,
 * used only from our own Route Handlers (app/api/auth/*) — never from page code.
 * Unlike lib/api/client.ts, this returns the raw Response so the caller can
 * read Set-Cookie headers (the backend's refresh_token cookie) before we
 * forward them to the browser.
 */
export async function backendAuthFetch(path: string, init: RequestInit & { cookie?: string }): Promise<Response> {
  const { cookie, headers, ...rest } = init;
  return fetch(`${API_URL}/api/v1/auth${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
  });
}

export async function parseBackendJson<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

/**
 * The backend sets refresh_token scoped to Path=/api/v1/auth (see
 * wedhub-backend/src/modules/auth/auth.controller.ts). Our own auth Route
 * Handlers live at /api/auth/*, a different path — if we forwarded the
 * Set-Cookie header verbatim, the browser would never actually send that
 * cookie back to us (verified live: a real refresh call 401'd with "Missing
 * refresh token" until this rewrite was added). Rewrite Path to our own
 * auth prefix so the browser attaches it on every /api/auth/* call.
 */
export function rewriteRefreshCookiePath(setCookieHeader: string): string {
  return setCookieHeader.replace(/Path=\/api\/v1\/auth/i, "Path=/api/auth");
}
