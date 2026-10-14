"use client";

import type { ApiResponse } from "./types";
import type { CreateOfferInput, Offer, UpdateOfferInput } from "./vendor-offers.types";

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function getMyOffers() {
  return call<Offer[]>("/offers/me", "GET");
}

export function createMyOffer(body: CreateOfferInput) {
  return call<Offer>("/offers/me", "POST", body);
}

export function updateMyOffer(id: string, body: UpdateOfferInput) {
  return call<Offer>(`/offers/me/${id}`, "PUT", body);
}

export function deleteMyOffer(id: string) {
  return call<{ success: boolean }>(`/offers/me/${id}`, "DELETE");
}
