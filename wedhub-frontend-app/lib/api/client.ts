import "server-only";
import { cookies } from "next/headers";
import { ApiRequestError, type ApiResponse } from "./types";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip attaching the session cookie — for public endpoints called during unauthenticated flows. */
  skipAuth?: boolean;
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
  const { method = "GET", body, query, skipAuth = false, cache, next } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!skipAuth) {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);
    if (session) headers["Authorization"] = `Bearer ${session.value}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
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
