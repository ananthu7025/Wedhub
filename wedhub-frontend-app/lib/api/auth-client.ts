"use client";

import type { ApiResponse } from "./types";
import type { AuthenticatedUser, UserRole } from "@/lib/auth/types";

/**
 * Client-side calls to OUR OWN /api/auth/* Route Handlers (never the backend
 * directly — see frontenddocs/10-risks-and-open-questions.md Open Question 4
 * for why: sameSite=strict on the backend's refresh cookie requires the
 * browser to only ever talk to our own origin for auth).
 */

async function postJson<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function login(identifier: string, password: string) {
  return postJson<{ user: AuthenticatedUser }>("/api/auth/login", { identifier, password });
}

export function register(email: string, password: string, role: Extract<UserRole, "END_USER" | "VENDOR">, phone?: string) {
  return postJson<{ user: AuthenticatedUser }>("/api/auth/register", { email, password, role, phone });
}

export function logout() {
  return postJson<{ loggedOut: true }>("/api/auth/logout", {});
}
