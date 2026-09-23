import Papa from "papaparse";
import { NotFoundError, ValidationError } from "../../common/errors";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import { getPublicUrl } from "../../integrations/storage/r2.client";
import { assertVendorFeatureAccess } from "../entitlements/entitlement.service";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import { findApprovedVendorBySlug } from "../vendors/vendor.repository";
import * as catalogRepository from "./catalog.repository";
import type {
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
  SetAvailabilityInput,
  ClearAvailabilityInput,
  UpsertCatalogVariantFieldInput,
  ReorderCatalogVariantFieldsInput,
  ImportCatalogItemsInput,
} from "./catalog.types";

type CatalogItemWithRelations = Awaited<ReturnType<typeof catalogRepository.findCatalogItems>>[number];

function formatItem(item: CatalogItemWithRelations) {
  return {
    id: item.id,
    vendorId: item.vendorId,
    title: item.title,
    slug: item.slug,
    description: item.description,
    basePrice: item.basePrice != null ? Number(item.basePrice) : null,
    isCustomizable: item.isCustomizable,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    media: item.media.map((m) => ({
      id: m.id,
      mediaId: m.mediaId,
      sortOrder: m.sortOrder,
      url: m.media.optimizedObjectKey ? getPublicUrl(m.media.optimizedObjectKey) : getPublicUrl(m.media.originalObjectKey),
      thumbnailUrl: m.media.thumbnailObjectKey ? getPublicUrl(m.media.thumbnailObjectKey) : null,
    })),
    variants: item.variants.map((v) => ({
      id: v.id,
      attributes: v.attributes,
      price: Number(v.price),
      sku: v.sku,
      stockQuantity: v.stockQuantity,
      isAvailable: v.isAvailable,
      sortOrder: v.sortOrder,
    })),
    components: item.components.map((c) => ({
      id: c.id,
      name: c.name,
      defaultQty: c.defaultQty,
      minQty: c.minQty,
      maxQty: c.maxQty,
      unitPrice: c.unitPrice != null ? Number(c.unitPrice) : null,
      isRequired: c.isRequired,
      sortOrder: c.sortOrder,
    })),
  };
}

// Same ordering as vendor-store.service.ts's createStoreItem: plan
// entitlement checked before category eligibility. Centralized here (both
// checks, one function) rather than repeated per call site — every mutating
// catalog.service.ts function already routes through this single gate.
async function assertCatalogEligible(vendorId: string) {
  await assertVendorFeatureAccess(vendorId, "catalog_access", "Catalog");
  const isEligible = await catalogRepository.checkVendorCatalogEligibility(vendorId);
  if (!isEligible) {
    throw new ValidationError(
      "Your vendor category does not currently have the catalog feature enabled. Contact admin to enable it for your category.",
    );
  }
}

export async function listVendorCatalogItems(userId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const items = await catalogRepository.findCatalogItems(vendor.id, true);
  return items.map(formatItem);
}

export async function getVendorCatalogItem(userId: string, itemId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const item = await catalogRepository.findCatalogItemById(itemId);
  if (!item || item.vendorId !== vendor.id) {
    throw new NotFoundError("Catalog item not found");
  }
  return formatItem(item);
}

export async function createCatalogItem(userId: string, input: CreateCatalogItemInput) {
  const vendor = await getOwnedVendorOrThrow(userId);
  await assertCatalogEligible(vendor.id);

  const baseSlug = slugify(input.title);
  const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
    const existing = await catalogRepository.findCatalogItems(vendor.id, true);
    return existing.some((item) => item.slug === candidate);
  });

  const created = await catalogRepository.createCatalogItem(vendor.id, {
    title: input.title,
    slug,
    description: input.description,
    basePrice: input.basePrice,
    isCustomizable: input.isCustomizable,
    isActive: input.isActive,
    mediaIds: input.mediaIds,
    variants: input.variants,
    components: input.components,
  });

  const reloaded = await catalogRepository.findCatalogItemById(created.id);
  if (!reloaded) throw new NotFoundError("Failed to fetch created catalog item");
  return formatItem(reloaded);
}

export async function updateCatalogItem(userId: string, itemId: string, input: UpdateCatalogItemInput) {
  const vendor = await getOwnedVendorOrThrow(userId);
  // Same asymmetry as vendor-store.service.ts's updateStoreItem: plan access
  // is re-checked on every mutation, but category eligibility is only
  // checked at create time (a vendor's category doesn't change mid-edit).
  await assertVendorFeatureAccess(vendor.id, "catalog_access", "Catalog");
  const existing = await catalogRepository.findCatalogItemById(itemId);
  if (!existing || existing.vendorId !== vendor.id) {
    throw new NotFoundError("Catalog item not found");
  }

  await catalogRepository.updateCatalogItem(itemId, {
    title: input.title,
    description: input.description,
    basePrice: input.basePrice,
    isCustomizable: input.isCustomizable,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    mediaIds: input.mediaIds,
    variants: input.variants,
    components: input.components,
  });

  const reloaded = await catalogRepository.findCatalogItemById(itemId);
  if (!reloaded) throw new NotFoundError("Failed to fetch updated catalog item");
  return formatItem(reloaded);
}

export async function deleteCatalogItem(userId: string, itemId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const existing = await catalogRepository.findCatalogItemById(itemId);
  if (!existing || existing.vendorId !== vendor.id) {
    throw new NotFoundError("Catalog item not found");
  }

  // Deletion stays ungated — same precedent as vendor-store's item delete:
  // removing value must still work even if catalog access lapses.
  await catalogRepository.deleteCatalogItem(itemId);
  return { success: true };
}

// ---- Availability ----

async function assertOwnedItemAndVariant(userId: string, itemId: string, variantId: string | null | undefined) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const item = await catalogRepository.findCatalogItemById(itemId);
  if (!item || item.vendorId !== vendor.id) {
    throw new NotFoundError("Catalog item not found");
  }
  if (variantId && !item.variants.some((v) => v.id === variantId)) {
    throw new ValidationError("Variant does not belong to this catalog item");
  }
  return item;
}

export async function setItemAvailability(userId: string, itemId: string, input: SetAvailabilityInput) {
  const item = await assertOwnedItemAndVariant(userId, itemId, input.variantId);
  await assertVendorFeatureAccess(item.vendorId, "catalog_access", "Catalog");
  await catalogRepository.setAvailability(itemId, input.variantId ?? null, input.dates, input.status, input.note ?? null);
  return catalogRepository.findAvailability(itemId);
}

// Ungated, same "removing value must still work" precedent as
// deleteCatalogItem — a vendor whose plan lapses can still clear stale
// blocks rather than being stuck showing incorrect availability.
export async function clearItemAvailability(userId: string, itemId: string, input: ClearAvailabilityInput) {
  await assertOwnedItemAndVariant(userId, itemId, input.variantId);
  await catalogRepository.clearAvailability(itemId, input.variantId ?? null, input.dates);
  return catalogRepository.findAvailability(itemId);
}

export async function getItemAvailability(userId: string, itemId: string, from?: string, to?: string) {
  await assertOwnedItemAndVariant(userId, itemId, undefined);
  return catalogRepository.findAvailability(itemId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
}

export async function getPublicItemAvailability(itemId: string, from?: string, to?: string) {
  const item = await catalogRepository.findCatalogItemById(itemId);
  if (!item || !item.isActive) {
    throw new NotFoundError("Catalog item not found");
  }
  return catalogRepository.findAvailability(itemId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
}

// ---- Admin: per-category variant field configuration ----

export async function listVariantFields(categoryId: string) {
  return catalogRepository.findVariantFieldsByCategoryId(categoryId);
}

export async function createVariantField(categoryId: string, input: UpsertCatalogVariantFieldInput) {
  return catalogRepository.createVariantField(categoryId, input);
}

export async function updateVariantField(fieldId: string, input: Partial<UpsertCatalogVariantFieldInput>) {
  const existing = await catalogRepository.findVariantFieldById(fieldId);
  if (!existing) throw new NotFoundError("Variant field not found");
  return catalogRepository.updateVariantField(fieldId, input);
}

export async function deleteVariantField(fieldId: string) {
  const existing = await catalogRepository.findVariantFieldById(fieldId);
  if (!existing) throw new NotFoundError("Variant field not found");
  await catalogRepository.deleteVariantField(fieldId);
  return { success: true };
}

export async function reorderVariantFields(categoryId: string, input: ReorderCatalogVariantFieldsInput) {
  await catalogRepository.reorderVariantFields(categoryId, input.orderedIds);
  return catalogRepository.findVariantFieldsByCategoryId(categoryId);
}

// ---- CSV bulk import ----

function variantColumnName(fieldKey: string): string {
  return `variant_${fieldKey}`;
}

function coerceVariantAttributeValue(rawValue: string, dataType: UpsertCatalogVariantFieldInput["dataType"]): unknown {
  const trimmed = rawValue.trim();
  if (trimmed === "") return undefined;

  switch (dataType) {
    case "BOOLEAN":
      return ["true", "1", "yes", "y"].includes(trimmed.toLowerCase());
    case "NUMBER": {
      const num = Number(trimmed);
      return Number.isNaN(num) ? undefined : num;
    }
    case "MULTI_SELECT":
      return trimmed.split("|").map((v) => v.trim()).filter(Boolean);
    default:
      return trimmed;
  }
}

export async function getImportTemplate(userId: string): Promise<{ filename: string; csv: string }> {
  const vendor = await getOwnedVendorOrThrow(userId);
  const categoryId = await catalogRepository.findPrimaryCategoryId(vendor.id);
  const variantFields = categoryId ? await catalogRepository.findVariantFieldsByCategoryId(categoryId) : [];

  const columns = [
    "title",
    "description",
    "basePrice",
    "isActive",
    ...variantFields.map((f) => variantColumnName(f.key)),
    "variantPrice",
    "variantSku",
    "variantStock",
  ];

  const exampleRow: Record<string, string> = {
    title: "Example Item",
    description: "Describe this item",
    basePrice: "",
    isActive: "true",
    variantPrice: "999",
    variantSku: "",
    variantStock: "",
  };
  for (const field of variantFields) {
    exampleRow[variantColumnName(field.key)] =
      field.dataType === "BOOLEAN"
        ? "true"
        : Array.isArray(field.options) && (field.options as string[]).length > 0
          ? (field.options as string[])[0]!
          : "";
  }

  const csv = Papa.unparse({ fields: columns, data: [columns.map((c) => exampleRow[c] ?? "")] });
  return { filename: "catalog-import-template.csv", csv };
}

interface ImportRowResult {
  row: number;
  title: string;
  status: "created" | "error";
  error?: string;
}

export async function importCatalogItems(userId: string, input: ImportCatalogItemsInput) {
  const vendor = await getOwnedVendorOrThrow(userId);
  await assertCatalogEligible(vendor.id);

  const categoryId = await catalogRepository.findPrimaryCategoryId(vendor.id);
  const variantFields = categoryId ? await catalogRepository.findVariantFieldsByCategoryId(categoryId) : [];
  const fieldByColumn = new Map(variantFields.map((f) => [variantColumnName(f.key), f]));

  const parsed = Papa.parse<Record<string, string>>(input.csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new ValidationError(`CSV parse error: ${parsed.errors[0]!.message} (row ${parsed.errors[0]!.row ?? "?"})`);
  }

  // Group consecutive rows by title+slug so multiple variant rows for the
  // same item collapse into one CatalogItem with multiple variants, per the
  // plan's "grouped by title+slug" design.
  const groups = new Map<string, { rowIndexes: number[]; rows: Record<string, string>[] }>();
  const rowOrder: string[] = [];
  parsed.data.forEach((row, index) => {
    const title = (row.title ?? "").trim();
    if (!title) return;
    const key = slugify(title);
    if (!groups.has(key)) {
      groups.set(key, { rowIndexes: [], rows: [] });
      rowOrder.push(key);
    }
    const group = groups.get(key)!;
    group.rowIndexes.push(index + 2); // +2: 1-indexed + header row
    group.rows.push(row);
  });

  const results: ImportRowResult[] = [];
  const existingItems = await catalogRepository.findCatalogItems(vendor.id, true);
  const existingSlugs = new Set(existingItems.map((i) => i.slug));

  for (const key of rowOrder) {
    const group = groups.get(key)!;
    const firstRow = group.rows[0]!;
    const title = firstRow.title!.trim();
    const firstRowNum = group.rowIndexes[0]!;

    try {
      const description = firstRow.description?.trim() || null;
      const basePriceRaw = firstRow.basePrice?.trim();
      const basePrice = basePriceRaw ? Number(basePriceRaw) : null;
      if (basePriceRaw && Number.isNaN(basePrice)) {
        throw new Error(`Invalid basePrice "${basePriceRaw}"`);
      }
      const isActive = firstRow.isActive?.trim().toLowerCase() !== "false";

      const variants = group.rows.map((row, i) => {
        const priceRaw = row.variantPrice?.trim();
        const price = Number(priceRaw);
        if (!priceRaw || Number.isNaN(price) || price < 0) {
          throw new Error(`Row ${group.rowIndexes[i]}: invalid or missing variantPrice`);
        }
        const attributes: Record<string, unknown> = {};
        for (const [column, field] of fieldByColumn) {
          const value = coerceVariantAttributeValue(row[column] ?? "", field.dataType as UpsertCatalogVariantFieldInput["dataType"]);
          if (value !== undefined) attributes[field.key] = value;
        }
        const stockRaw = row.variantStock?.trim();
        return {
          attributes,
          price,
          sku: row.variantSku?.trim() || null,
          stockQuantity: stockRaw ? Number(stockRaw) : null,
          isAvailable: true,
        };
      });

      const baseSlug = slugify(title);
      const slug = await generateUniqueSlug(baseSlug, async (candidate) => existingSlugs.has(candidate));
      existingSlugs.add(slug);

      await catalogRepository.createCatalogItem(vendor.id, {
        title,
        slug,
        description,
        basePrice,
        isCustomizable: false,
        isActive,
        variants,
      });

      results.push({ row: firstRowNum, title, status: "created" });
    } catch (err) {
      results.push({ row: firstRowNum, title, status: "error", error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return {
    totalGroups: rowOrder.length,
    created: results.filter((r) => r.status === "created").length,
    failed: results.filter((r) => r.status === "error").length,
    results,
  };
}

// ---- Public read ----

export async function listPublicCatalogItems(vendorSlug: string) {
  const vendor = await findApprovedVendorBySlug(vendorSlug);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  const items = await catalogRepository.findCatalogItems(vendor.id, false);
  return items.map(formatItem);
}
