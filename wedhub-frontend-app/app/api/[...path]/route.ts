import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken, setAccessTokenCookie } from "@/lib/auth/session";
import { backendAuthFetch, parseBackendJson, rewriteRefreshCookiePath } from "@/lib/auth/backend";

/**
 * Generic authenticated proxy for every backend module EXCEPT /auth/* (which
 * has its own dedicated Route Handlers under app/api/auth/ — see
 * frontenddocs/10-risks-and-open-questions.md Open Question 4 for why auth
 * needs bespoke cookie-forwarding logic that this generic proxy doesn't do).
 *
 * Client Components call same-origin paths like /api/users/me, which this
 * catches, attaches the session's access token as a Bearer header, and
 * forwards to the real backend at /api/v1/<path>. This keeps the access
 * token out of client-side JS entirely (it never leaves the httpOnly
 * cookie) while still letting Client Components make authenticated calls.
 */

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function proxyRequest(request: NextRequest, path: string[]): Promise<NextResponse> {
  const joinedPath = path.join("/");

  if (joinedPath.startsWith("auth/")) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Use /api/auth/* instead" } },
      { status: 404 },
    );
  }

  let accessToken = await getAccessToken();
  const targetUrl = new URL(`/api/v1/${joinedPath}`, API_URL);
  targetUrl.search = request.nextUrl.search;

  const headers: Record<string, string> = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  // This call is server-to-server (Next.js -> backend on 127.0.0.1), so the
  // backend's IP-based rate limiters would otherwise key every visitor off
  // the same loopback address. Relay the real visitor IP Nginx already put
  // in X-Forwarded-For so the backend can rate-limit per actual client —
  // see wedhub-backend's app.ts trust-proxy config, which only trusts this
  // header coming from its own loopback caller.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const requestBody = hasBody ? await request.text() : undefined;

  let backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: requestBody,
  });

  const extraSetCookies: string[] = [];

  // If 401, check if we have a refresh token to perform automatic silent token refresh
  if (backendResponse.status === 401) {
    const rawCookieHeader = request.headers.get("cookie");
    if (rawCookieHeader && rawCookieHeader.includes("refresh_token=")) {
      try {
        const refreshRes = await backendAuthFetch("/refresh", {
          method: "POST",
          cookie: rawCookieHeader,
        });
        const refreshJson = await parseBackendJson<{ accessToken: string }>(refreshRes);
        if (refreshJson.success && refreshJson.data?.accessToken) {
          const newAccessToken = refreshJson.data.accessToken;
          await setAccessTokenCookie(newAccessToken);

          const rotatedSetCookie = refreshRes.headers.get("set-cookie");
          if (rotatedSetCookie) {
            extraSetCookies.push(rewriteRefreshCookiePath(rotatedSetCookie));
          }

          // Retry original request with the new access token
          headers["Authorization"] = `Bearer ${newAccessToken}`;
          backendResponse = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: requestBody,
          });
        }
      } catch {
        // Fall back to original backend response if refresh fails
      }
    }
  }

  const responseBody = await backendResponse.text();
  const res = new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: { "Content-Type": backendResponse.headers.get("content-type") ?? "application/json" },
  });

  for (const cookie of extraSetCookies) {
    res.headers.append("set-cookie", cookie);
  }

  return res;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
