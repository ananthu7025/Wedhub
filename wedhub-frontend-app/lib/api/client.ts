import "server-only";
import { cookies, headers } from "next/headers";
import { ApiRequestError, type ApiResponse } from "./types";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip attaching the session cookie — for public endpoints called during unauthenticated flows. */
  skipAuth?: boolean;
  /**
   * Marks a call as hitting a route with no IP-keyed rate limiter, so it's
   * safe to skip relaying X-Forwarded-For (see apiFetch's comment below).
   * Skipping that relay is what makes the call eligible for static/cached
   * rendering — independent of skipAuth, since some skipAuth calls (e.g.
   * search) DO hit a rate-limited route and must keep relaying the real IP.
   * Only set this on calls confirmed to hit an unrate-limited backend route.
   */
  public?: boolean;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`/api/v1${path}`, API_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Server-only fetch wrapper. Unwraps the backend's {success, data, meta} /
 * {success: false, error} envelope once, centrally — see
 * frontenddocs/01-reference-cross-cutting.md "API integration standard".
 * Client Components never call this directly; they go through Server
 * Components/Server Actions/Route Handlers that use this client.
 */
export async function apiFetch<T, M = Record<string, unknown>>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: M }> {
  const { method = "GET", body, query, skipAuth = false, public: isPublic = false, cache, next } = options;

  const requestHeaders: Record<string, string> = {};
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";

  if (!skipAuth) {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);
    if (session) requestHeaders["Authorization"] = `Bearer ${session.value}`;
  }

  // Server Component -> backend calls are server-to-server (127.0.0.1), so
  // without this every visitor would share one IP-keyed rate-limit budget
  // on the backend. Relay the real visitor IP Nginx put in X-Forwarded-For
  // (same fix as the Client Component proxy at app/api/[...path]/route.ts).
  // Calling headers() forces the calling route to render dynamically, so
  // this is skipped entirely for `public: true` calls — routes confirmed to
  // have no IP-keyed rate limiter, where the relay serves no purpose anyway.
  if (!isPublic) {
    const incomingForwardedFor = (await headers()).get("x-forwarded-for");
    if (incomingForwardedFor) requestHeaders["X-Forwarded-For"] = incomingForwardedFor;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  const json = (await response.json()) as ApiResponse<T, M>;

  if (!json.success) {
    throw new ApiRequestError(response.status, json.error.code, json.error.message, json.error.details);
  }

  return { data: json.data, meta: json.meta };
}
