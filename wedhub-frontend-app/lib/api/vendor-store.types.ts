export type StoreItemType =
  | "PHYSICAL_PRODUCT"
  | "RENTAL_ITEM"
  | "DIGITAL_DOWNLOAD"
  | "SERVICE_TOKEN";

export type StoreOrderStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED_OR_READY"
  | "COMPLETED"
  | "CANCELLED";

export interface UpsertStoreProfileInput {
  storeName?: string;
  tagline?: string | null;
  aboutStore?: string | null;
  isEnabled?: boolean;
  whatsappOrderPhone?: string | null;
  shippingPolicy?: string | null;
  returnPolicy?: string | null;
  minOrderValue?: number | null;
}

export interface CreateStoreItemInput {
  title: string;
  description?: string | null;
  itemType?: StoreItemType;
  price: number;
  compareAtPrice?: number | null;
  gstRate?: number;
  minOrderQuantity?: number;
  stockQuantity?: number | null;
  isAvailable?: boolean;
  tags?: string[];
  mediaIds?: string[];
}

export interface UpdateStoreItemInput {
  title?: string;
  description?: string | null;
  itemType?: StoreItemType;
  price?: number;
  compareAtPrice?: number | null;
  gstRate?: number;
  minOrderQuantity?: number;
  stockQuantity?: number | null;
  isAvailable?: boolean;
  tags?: string[];
  mediaIds?: string[];
}

export interface StoreItemMedia {
  id: string;
  mediaId: string;
  sortOrder: number;
  url: string | null;
  thumbnailUrl: string | null;
  moderationStatus: string;
}

export interface VendorStoreItem {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  description: string | null;
  itemType: StoreItemType;
  price: number;
  compareAtPrice: number | null;
  gstRate: number;
  minOrderQuantity: number;
  stockQuantity: number | null;
  isAvailable: boolean;
  tags: string[];
  sortOrder?: number;
  media: StoreItemMedia[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorStoreProfile {
  id: string | null;
  vendorId: string;
  storeName: string;
  slug: string;
  tagline: string | null;
  aboutStore: string | null;
  isEnabled: boolean;
  currency: string;
  whatsappOrderPhone: string | null;
  shippingPolicy: string | null;
  returnPolicy: string | null;
  minOrderValue: number | null;
  isEligible: boolean;
  itemCount: number;
  orderCount: number;
}

export interface VendorStoreOrderItem {
  id: string;
  itemId: string;
  itemTitle: string;
  unitPrice: number;
  gstRate: number;
  quantity: number;
  totalPrice: number;
  customizationNotes: string | null;
}

export interface VendorStoreOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string | null;
  city: string | null;
  customerState: string | null;
  pincode: string | null;
  eventDate: string | null;
  totalAmount: number;
  status: StoreOrderStatus;
  orderChannel: string;
  paymentStatus: string;
  notes: string | null;
  invoiceId: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    grandTotal: number;
  } | null;
  createdAt: string;
  items: VendorStoreOrderItem[];
}

export interface UpdateOrderStatusInput {
  status?: StoreOrderStatus;
  paymentStatus?: string;
}

export interface PublicCreateOrderItemInput {
  itemId: string;
  quantity: number;
  customizationNotes?: string | null;
}

export interface PublicCreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddress?: string | null;
  city?: string | null;
  customerState?: string | null;
  pincode?: string | null;
  eventDate?: string | null;
  notes?: string | null;
  items: PublicCreateOrderItemInput[];
}

export interface PublicStoreData {
  id: string;
  storeName: string;
  slug: string;
  tagline: string | null;
  aboutStore: string | null;
  whatsappOrderPhone: string | null;
  shippingPolicy: string | null;
  returnPolicy: string | null;
  minOrderValue: number | null;
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
  };
}
