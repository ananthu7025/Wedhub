import type { StoreItemType, StoreOrderStatus, StorePaymentStatus } from "@prisma/client";

export type { StoreItemType, StoreOrderStatus, StorePaymentStatus };


export interface UpsertStoreProfileInput {
  storeName?: string | undefined;
  tagline?: string | null | undefined;
  aboutStore?: string | null | undefined;
  isEnabled?: boolean | undefined;
  whatsappOrderPhone?: string | null | undefined;
  shippingPolicy?: string | null | undefined;
  returnPolicy?: string | null | undefined;
  minOrderValue?: number | null | undefined;
}

export interface CreateStoreItemInput {
  title: string;
  description?: string | null | undefined;
  itemType?: StoreItemType | undefined;
  price: number;
  compareAtPrice?: number | null | undefined;
  gstRate?: number | undefined;
  minOrderQuantity?: number | undefined;
  stockQuantity?: number | null | undefined;
  isAvailable?: boolean | undefined;
  tags?: string[] | undefined;
  mediaIds?: string[] | undefined;
}

export interface UpdateStoreItemInput {
  title?: string | undefined;
  description?: string | null | undefined;
  itemType?: StoreItemType | undefined;
  price?: number | undefined;
  compareAtPrice?: number | null | undefined;
  gstRate?: number | undefined;
  minOrderQuantity?: number | undefined;
  stockQuantity?: number | null | undefined;
  isAvailable?: boolean | undefined;
  tags?: string[] | undefined;
  mediaIds?: string[] | undefined;
}

export interface PublicCreateOrderItemInput {
  itemId: string;
  quantity: number;
  customizationNotes?: string | null | undefined;
}

export interface PublicCreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null | undefined;
  shippingAddress?: string | null | undefined;
  city?: string | null | undefined;
  customerState?: string | null | undefined;
  pincode?: string | null | undefined;
  eventDate?: string | null | undefined;
  notes?: string | null | undefined;
  paymentMethod?: "ONLINE" | "WHATSAPP" | undefined;
  items: PublicCreateOrderItemInput[];
}

export interface UpdateOrderStatusInput {
  status?: StoreOrderStatus | undefined;
  paymentStatus?: StorePaymentStatus | undefined;
}

