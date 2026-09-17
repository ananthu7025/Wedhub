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

// role is omitted on the plain /login page (no signup-intent context there)
// — a first-time Google identity in that case gets a NOT_FOUND error back
// instead of being silently registered; see GoogleSignInButton.tsx.
export function loginWithGoogle(idToken: string, role?: Extract<UserRole, "END_USER" | "VENDOR">) {
  return postJson<{ user: AuthenticatedUser }>("/api/auth/google", { idToken, role });
}

export function register(email: string, password: string, role: Extract<UserRole, "END_USER" | "VENDOR">, phone?: string) {
  return postJson<{ user: AuthenticatedUser }>("/api/auth/register", { email, password, role, phone });
}

export function logout() {
  return postJson<{ loggedOut: true }>("/api/auth/logout", {});
}

// Re-mints the access token from the current refresh token without asking
// for a password again — the one case this is used for today is the
// "verify your email" pending page's "I've verified" button: the backend's
// refresh() re-reads emailVerifiedAt from the database (see auth.service.ts),
// so this is what actually clears a stale emailVerified: false claim baked
// into the current session cookie without a full logout/login round-trip.
export function refreshSession() {
  return postJson<Record<string, never>>("/api/auth/refresh", {});
}

// Revokes every refresh token for the current user (all devices/sessions),
// not just this browser's — see wedhub-backend's auth.service.ts
// logoutAllDevices / POST /auth/logout-all.
export function logoutAllDevices() {
  return postJson<{ loggedOut: true }>("/api/auth/logout-all", {});
}

// Authenticated resend, used by the "verify your email" interstitial/pending
// page's "Resend email" button. Rate-limited server-side (see
// wedhub-backend's resendVerificationRateLimiter).
export function resendVerificationEmail() {
  return postJson<{ sent: true }>("/api/auth/me/resend-verification", {});
}

// Starts an email change — does NOT change the account's email yet. A
// confirmation link is sent to newEmail; only clicking it (confirmEmailChange
// below) actually moves the account over. See wedhub-backend's
// auth.service.ts::changeEmail() for why.
export function changeEmail(newEmail: string, currentPassword: string) {
  return postJson<{ pending: true }>("/api/auth/me/change-email", { newEmail, currentPassword });
}

export function confirmEmailChange(token: string) {
  return postJson<{ email: string }>("/api/auth/confirm-email-change", { token });
}
