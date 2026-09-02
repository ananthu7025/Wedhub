"use client";

import type { ApiResponse } from "./types";

interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
}

export async function updateMyProfile(body: UpdateProfileBody): Promise<ApiResponse<unknown>> {
  const response = await fetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<unknown>;
}
