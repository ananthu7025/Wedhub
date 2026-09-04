"use client";

import type { ApiResponse } from "./types";
import type {
  CreateStoreItemInput,
  PublicCreateOrderInput,
  PublicStoreData,
  StoreOrderStatus,
  UpdateOrderStatusInput,
  UpdateStoreItemInput,
  UpsertStoreProfileInput,
  VendorStoreItem,
  VendorStoreOrder,
  VendorStoreProfile,
} from "./vendor-store.types";

async function call<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

// ---------------------------------------------------------------------------
// Vendor-authenticated actions
// ---------------------------------------------------------------------------

export function getMyStoreProfile() {
  return call<VendorStoreProfile>("/vendor-store/me", "GET");
}

export function updateMyStoreProfile(body: UpsertStoreProfileInput) {
  return call<VendorStoreProfile>("/vendor-store/me", "POST", body);
}

export function getMyStoreItems() {
  return call<VendorStoreItem[]>("/vendor-store/me/items", "GET");
}

export function createMyStoreItem(body: CreateStoreItemInput) {
  return call<VendorStoreItem>("/vendor-store/me/items", "POST", body);
}

export function updateMyStoreItem(id: string, body: UpdateStoreItemInput) {
  return call<VendorStoreItem>(`/vendor-store/me/items/${id}`, "PUT", body);
}

export function deleteMyStoreItem(id: string) {
  return call<{ success: boolean }>(`/vendor-store/me/items/${id}`, "DELETE");
}

export function getMyStoreOrders(status?: StoreOrderStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return call<VendorStoreOrder[]>(`/vendor-store/me/orders${query}`, "GET");
}

export function updateMyStoreOrderStatus(id: string, body: UpdateOrderStatusInput) {
  return call<VendorStoreOrder>(`/vendor-store/me/orders/${id}/status`, "PATCH", body);
}

export function createMyStoreOrderInvoice(id: string) {
  return call<{
    invoice: { id: string; invoiceNumber: string; grandTotal: number };
    alreadyExists: boolean;
  }>(`/vendor-store/me/orders/${id}/create-invoice`, "POST");
}

// ---------------------------------------------------------------------------
// Public Storefront actions
// ---------------------------------------------------------------------------

export function getPublicStore(slug: string) {
  return call<PublicStoreData>(`/stores/${encodeURIComponent(slug)}`, "GET");
}

export function getPublicStoreItems(slug: string) {
  return call<VendorStoreItem[]>(`/stores/${encodeURIComponent(slug)}/items`, "GET");
}

export function createPublicStoreOrder(slug: string, body: PublicCreateOrderInput) {
  return call<{
    orderId: string;
    orderNumber: string;
    whatsappUrl: string;
    totalAmount: number;
  }>(`/stores/${encodeURIComponent(slug)}/orders`, "POST", body);
}
