"use client";

import type { ApiResponse } from "./types";
import type { NotificationPreference, SetPreferenceBody } from "./notification-preferences.types";

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function setNotificationPreference(body: SetPreferenceBody) {
  return call<NotificationPreference>("/notifications/me/preferences", "PUT", body);
}
