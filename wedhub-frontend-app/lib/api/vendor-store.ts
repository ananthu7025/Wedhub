import "server-only";
import { apiFetch } from "./client";
import type {
  PublicStoreData,
  StoreOrderStatus,
  VendorStoreItem,
  VendorStoreOrder,
  VendorStoreProfile,
} from "./vendor-store.types";

export function fetchPublicStore(slug: string) {
  return apiFetch<PublicStoreData>(`/stores/${encodeURIComponent(slug)}`, {
    skipAuth: true,
    cache: "no-store",
  });
}

export function fetchPublicStoreItems(slug: string) {
  return apiFetch<VendorStoreItem[]>(`/stores/${encodeURIComponent(slug)}/items`, {
    skipAuth: true,
    cache: "no-store",
  });
}

export function fetchVendorStoreProfile() {
  return apiFetch<VendorStoreProfile>("/vendor-store/me", {
    cache: "no-store",
  });
}

export function fetchVendorStoreItems() {
  return apiFetch<VendorStoreItem[]>("/vendor-store/me/items", {
    cache: "no-store",
  });
}

export function fetchVendorStoreOrders(status?: StoreOrderStatus) {
  const query = status ? { status } : undefined;
  return apiFetch<VendorStoreOrder[]>("/vendor-store/me/orders", {
    query,
    cache: "no-store",
  });
}
