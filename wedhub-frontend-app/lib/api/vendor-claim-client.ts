"use client";

import type { ApiResponse } from "./types";

/**
 * Client-side calls to our own /api/vendor-claim/* Route Handlers — never
 * the backend directly, same reasoning as auth-client.ts (the claim-register
 * step mints a session the same way login/register do, via an httpOnly
 * cookie scoped to our own origin).
 */
async function postJson<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    const text = await response.text();
    try {
      return JSON.parse(text) as ApiResponse<T>;
    } catch {
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: response.ok
            ? "Unexpected response from server"
            : `Server returned an error (${response.status})`,
        },
      };
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network error. Please check your connection and try again.",
      },
    };
  }
}

export interface ResolveClaimInvitationData {
  vendorId: string;
  businessName: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
}

export async function resolveClaimInvitation(token: string): Promise<ApiResponse<ResolveClaimInvitationData>> {
  try {
    const response = await fetch(`/api/vendor-claim/resolve?token=${encodeURIComponent(token)}`, {
      method: "GET",
    });
    return (await response.json()) as ApiResponse<ResolveClaimInvitationData>;
  } catch (err) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network error. Please check your connection and try again.",
      },
    };
  }
}

export function sendClaimOtp(token: string) {
  return postJson<{ channel: "EMAIL" | "WHATSAPP" }>("/api/vendor-claim/send-otp", { token });
}

export function verifyClaimOtp(token: string, code: string) {
  return postJson<{ verified: true }>("/api/vendor-claim/verify-otp", { token, code });
}

export function claimRegister(input: { token: string; email: string; password: string; phone?: string }) {
  return postJson<{ vendorId: string }>("/api/vendor-claim/register", input);
}
