import "server-only";
import { apiFetch } from "./client";
import type {
  CatalogAvailabilityEntry,
  CatalogCollection,
  CatalogCollectionWithItems,
  CatalogItem,
  CatalogStoreSettings,
} from "./vendor-catalog.types";

export function fetchVendorCatalogItems() {
  return apiFetch<CatalogItem[]>("/catalog/me/items", {
    cache: "no-store",
  });
}

export function fetchVendorCatalogItem(itemId: string) {
  return apiFetch<CatalogItem>(`/catalog/me/items/${itemId}`, {
    cache: "no-store",
  });
}

export function fetchVendorCatalogItemAvailability(itemId: string) {
  return apiFetch<CatalogAvailabilityEntry[]>(`/catalog/me/items/${itemId}/availability`, {
    cache: "no-store",
  });
}

export function fetchPublicCatalogItems(vendorSlug: string) {
  return apiFetch<CatalogItem[]>(`/public-catalog/vendors/${encodeURIComponent(vendorSlug)}/items`, {
    skipAuth: true,
    cache: "no-store",
  });
}

export function fetchPublicCatalogItemAvailability(itemId: string, from?: string, to?: string) {
  return apiFetch<CatalogAvailabilityEntry[]>(`/public-catalog/items/${itemId}/availability`, {
    query: { from, to },
    skipAuth: true,
    cache: "no-store",
  });
}

export function fetchVendorCatalogStoreSettings() {
  return apiFetch<CatalogStoreSettings>("/catalog/me/settings", {
    cache: "no-store",
  });
}

export function fetchPublicCatalogStoreSettings(vendorSlug: string) {
  return apiFetch<CatalogStoreSettings>(`/public-catalog/vendors/${encodeURIComponent(vendorSlug)}/settings`, {
    skipAuth: true,
    cache: "no-store",
  });
}

export function fetchVendorCatalogCollections() {
  return apiFetch<CatalogCollection[]>("/catalog/me/collections", {
    cache: "no-store",
  });
}

export function fetchPublicCatalogCollections(vendorSlug: string) {
  return apiFetch<CatalogCollectionWithItems[]>(`/public-catalog/vendors/${encodeURIComponent(vendorSlug)}/collections`, {
    skipAuth: true,
    cache: "no-store",
  });
}
