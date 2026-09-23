export type AttributeDataType =
  | "BOOLEAN"
  | "NUMBER"
  | "TEXT"
  | "SELECT"
  | "MULTI_SELECT"
  | "TEXTAREA"
  | "NUMBER_RANGE"
  | "IMAGE"
  | "PHONE"
  | "URL"
  | "EMAIL"
  | "TIME"
  | "TIME_RANGE";

export type CatalogAvailabilityStatus = "BOOKED" | "BLOCKED";

export interface CatalogVariantField {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  dataType: AttributeDataType;
  options: unknown;
  isRequired: boolean;
  sortOrder: number;
}

export interface CatalogItemMedia {
  id: string;
  mediaId: string;
  sortOrder: number;
  url: string | null;
  thumbnailUrl: string | null;
}

export interface CatalogItemVariant {
  id: string;
  attributes: Record<string, unknown>;
  price: number;
  sku: string | null;
  stockQuantity: number | null;
  isAvailable: boolean;
  sortOrder: number;
}

export interface CatalogItemComponent {
  id: string;
  name: string;
  defaultQty: number;
  minQty: number;
  maxQty: number | null;
  unitPrice: number | null;
  isRequired: boolean;
  sortOrder: number;
}

export interface CatalogItem {
  id: string;
  vendorId: string;
  title: string;
  slug: string;
  description: string | null;
  basePrice: number | null;
  isCustomizable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  media: CatalogItemMedia[];
  variants: CatalogItemVariant[];
  components: CatalogItemComponent[];
}

export interface CatalogItemVariantInput {
  attributes: Record<string, unknown>;
  price: number;
  sku?: string | null;
  stockQuantity?: number | null;
  isAvailable?: boolean;
}

export interface CatalogItemComponentInput {
  name: string;
  defaultQty?: number;
  minQty?: number;
  maxQty?: number | null;
  unitPrice?: number | null;
  isRequired?: boolean;
}

export interface CreateCatalogItemInput {
  title: string;
  description?: string | null;
  basePrice?: number | null;
  isCustomizable?: boolean;
  isActive?: boolean;
  mediaIds?: string[];
  variants?: CatalogItemVariantInput[];
  components?: CatalogItemComponentInput[];
}

export type UpdateCatalogItemInput = Partial<CreateCatalogItemInput> & { sortOrder?: number };

export interface CatalogAvailabilityEntry {
  id: string;
  itemId: string;
  variantId: string | null;
  date: string;
  status: CatalogAvailabilityStatus;
  note: string | null;
}

// ---- Admin: per-category variant field configuration ----

export interface AdminUpsertCatalogVariantFieldBody {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options?: unknown;
  isRequired?: boolean;
  sortOrder?: number;
}

// ---- CSV bulk import ----

export interface CatalogImportRowResult {
  row: number;
  title: string;
  status: "created" | "error";
  error?: string;
}

export interface CatalogImportResult {
  totalGroups: number;
  created: number;
  failed: number;
  results: CatalogImportRowResult[];
}
