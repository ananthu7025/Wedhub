"use client";

import type { ApiResponse } from "./types";
import type {
  CatalogAvailabilityEntry,
  CatalogAvailabilityStatus,
  CatalogImportResult,
  CatalogItem,
  CatalogStoreSettings,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
  UpdateCatalogStoreSettingsInput,
} from "./vendor-catalog.types";

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function getMyCatalogItems() {
  return call<CatalogItem[]>("/catalog/me/items", "GET");
}

export function createMyCatalogItem(body: CreateCatalogItemInput) {
  return call<CatalogItem>("/catalog/me/items", "POST", body);
}

export function updateMyCatalogItem(id: string, body: UpdateCatalogItemInput) {
  return call<CatalogItem>(`/catalog/me/items/${id}`, "PUT", body);
}

export function deleteMyCatalogItem(id: string) {
  return call<{ success: boolean }>(`/catalog/me/items/${id}`, "DELETE");
}

export function getMyCatalogItemAvailability(itemId: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params.toString()}` : "";
  return call<CatalogAvailabilityEntry[]>(`/catalog/me/items/${itemId}/availability${query}`, "GET");
}

export function setMyCatalogItemAvailability(
  itemId: string,
  body: { variantId?: string | null; dates: string[]; status: CatalogAvailabilityStatus; note?: string | null },
) {
  return call<CatalogAvailabilityEntry[]>(`/catalog/me/items/${itemId}/availability`, "POST", body);
}

export function clearMyCatalogItemAvailability(itemId: string, body: { variantId?: string | null; dates: string[] }) {
  return call<CatalogAvailabilityEntry[]>(`/catalog/me/items/${itemId}/availability/clear`, "POST", body);
}

// Public, unauthenticated read — used by VendorPortfolioCatalog.tsx (a
// "use client" component on the public portfolio page), which cannot import
// lib/api/vendor-catalog.ts (that module is "server-only" — next/headers via
// client.ts — and can never be pulled into a client component's module
// graph, even for one function; this broke the Next.js production build).
// Routed through the same generic proxy (/api/[...path]/route.ts) every
// other client-side call uses.
export function getPublicCatalogItemAvailability(itemId: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params.toString()}` : "";
  return call<CatalogAvailabilityEntry[]>(`/public-catalog/items/${itemId}/availability${query}`, "GET");
}

export function importMyCatalogItems(csvContent: string) {
  return call<CatalogImportResult>("/catalog/me/items/import", "POST", { csvContent });
}

export function getMyCatalogStoreSettings() {
  return call<CatalogStoreSettings>("/catalog/me/settings", "GET");
}

export function updateMyCatalogStoreSettings(body: UpdateCatalogStoreSettingsInput) {
  return call<CatalogStoreSettings>("/catalog/me/settings", "PUT", body);
}

// Not routed through call() — the backend returns a raw text/csv response
// (Content-Disposition attachment), not the {success,data} JSON envelope
// every other endpoint uses, so it needs its own fetch + Blob download.
export async function downloadMyCatalogImportTemplate(): Promise<void> {
  const response = await fetch("/api/catalog/me/import-template", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to download the import template");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "catalog-import-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
