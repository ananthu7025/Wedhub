import { NextResponse, type NextRequest } from "next/server";
import { getAccessToken } from "@/lib/auth/session";

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

  const accessToken = await getAccessToken();
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

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
  });

  const responseBody = await backendResponse.text();
  return new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: { "Content-Type": backendResponse.headers.get("content-type") ?? "application/json" },
  });
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
