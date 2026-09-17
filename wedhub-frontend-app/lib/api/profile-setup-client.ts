"use client";

import type { ApiResponse } from "./types";
import type { WeddingProfileWithDetails } from "./profile-setup.types";

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export interface SubmitProfileSetupPayload {
  cityId: string;
  guestCount?: number;
  weddingStyle?: string;
  partnerName?: string;
  notes?: string;
  eventDates: {
    functionType: string;
    otherLabel?: string;
    date: string;
    time?: string;
    guestCount?: number;
  }[];
  categoryPreferences: {
    categoryId: string;
    budgetMin?: number;
    budgetMax?: number;
  }[];
}

export function submitProfileSetup(payload: SubmitProfileSetupPayload) {
  return call<{ weddingProfile: WeddingProfileWithDetails }>("/users/me/profile-setup", "POST", payload);
}

export function getProfileSetup() {
  return call<{ weddingProfile: WeddingProfileWithDetails | null }>("/users/me/profile-setup", "GET");
}
