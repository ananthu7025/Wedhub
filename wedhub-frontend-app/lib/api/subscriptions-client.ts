"use client";

import type { ApiResponse } from "./types";
import type { CancelSubscriptionBody, InitiateUpgradeBody, InitiateUpgradeResult, Subscription, SubscriptionWithoutPlan } from "./subscriptions.types";

/**
 * Client-side calls through the generic authenticated proxy for the
 * subscription page's interactive pieces (Frontend Arch Phase 7).
 */

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function initiateUpgrade(body: InitiateUpgradeBody) {
  return call<InitiateUpgradeResult>("/subscriptions/me/upgrade", "POST", body);
}

export function cancelMySubscription(body: CancelSubscriptionBody) {
  return call<SubscriptionWithoutPlan>("/subscriptions/me/cancel", "POST", body);
}

export function undoMyCancellation() {
  return call<SubscriptionWithoutPlan>("/subscriptions/me/undo-cancel", "POST");
}

export function getMySubscriptionClient() {
  return call<Subscription | null>("/subscriptions/me", "GET");
}
