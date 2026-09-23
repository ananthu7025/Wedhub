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

export type StoreAccentColor = "CRIMSON" | "EMERALD" | "NAVY" | "AMBER" | "PLUM" | "SLATE";

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

// ---- Public catalog page settings ----

export interface CatalogTrustBadge {
  title: string;
  subtitle: string;
}

export interface CatalogFooterLink {
  label: string;
  url: string;
}

export interface CatalogStoreSettings {
  vendorId: string;
  bannerUrl: string | null;
  heroHeadline: string | null;
  heroTagline: string | null;
  heroSubtitle: string | null;
  announcementText: string | null;
  shopButtonText: string | null;
  trialButtonText: string | null;
  accentColor: StoreAccentColor;
  categorySectionHeading: string | null;
  categorySectionSubheading: string | null;
  featuredSectionHeading: string | null;
  featuredSectionSubheading: string | null;
  promoEyebrow: string | null;
  promoHeading: string | null;
  promoDescription: string | null;
  promoQuote: string | null;
  galleryHeading: string | null;
  gallerySubheading: string | null;
  instagramUrl: string | null;
  trustBadges: CatalogTrustBadge[] | null;
  footerAboutText: string | null;
  footerQuickLinksHeading: string | null;
  footerSupportHeading: string | null;
  footerSocialHeading: string | null;
  footerLinks: CatalogFooterLink[] | null;
}

export interface UpdateCatalogStoreSettingsInput {
  bannerMediaId?: string | null;
  heroHeadline?: string | null;
  heroTagline?: string | null;
  heroSubtitle?: string | null;
  announcementText?: string | null;
  shopButtonText?: string | null;
  trialButtonText?: string | null;
  accentColor?: StoreAccentColor;
  categorySectionHeading?: string | null;
  categorySectionSubheading?: string | null;
  featuredSectionHeading?: string | null;
  featuredSectionSubheading?: string | null;
  promoEyebrow?: string | null;
  promoHeading?: string | null;
  promoDescription?: string | null;
  promoQuote?: string | null;
  galleryHeading?: string | null;
  gallerySubheading?: string | null;
  instagramUrl?: string | null;
  trustBadges?: CatalogTrustBadge[] | null;
  footerAboutText?: string | null;
  footerQuickLinksHeading?: string | null;
  footerSupportHeading?: string | null;
  footerSocialHeading?: string | null;
  footerLinks?: CatalogFooterLink[] | null;
}
