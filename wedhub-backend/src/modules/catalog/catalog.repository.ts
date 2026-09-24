import { prisma } from "../../config/database";
import { Prisma, type AttributeDataType, type CatalogAvailabilityStatus, type StoreAccentColor } from "@prisma/client";
import { omitUndefined } from "../../common/utils/object.util";

export async function checkVendorCatalogEligibility(vendorId: string): Promise<boolean> {
  const vendorCategories = await prisma.vendorCategory.findMany({
    where: { vendorId },
    include: { category: true },
  });

  return vendorCategories.some((vc) => vc.category.isActive && vc.category.hasCatalogEnabled);
}

// The primary category drives which CategoryCatalogVariantField set applies
// to this vendor's items — same "primary category defines the form" rule
// Category Details attributes already follow.
export async function findPrimaryCategoryId(vendorId: string): Promise<string | null> {
  const primary = await prisma.vendorCategory.findFirst({
    where: { vendorId, isPrimary: true },
    select: { categoryId: true },
  });
  return primary?.categoryId ?? null;
}

const ITEM_INCLUDE = {
  media: {
    include: {
      media: {
        select: {
          id: true,
          originalObjectKey: true,
          optimizedObjectKey: true,
          thumbnailObjectKey: true,
          moderationStatus: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
  variants: { orderBy: { sortOrder: "asc" as const } },
  components: { orderBy: { sortOrder: "asc" as const } },
  collections: { include: { collection: true } },
} satisfies Prisma.CatalogItemInclude;

export function findCatalogItems(vendorId: string, includeInactive = false) {
  return prisma.catalogItem.findMany({
    where: {
      vendorId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { sortOrder: "asc" },
    include: ITEM_INCLUDE,
  });
}

export function findCatalogItemById(id: string) {
  return prisma.catalogItem.findUnique({
    where: { id },
    include: ITEM_INCLUDE,
  });
}

interface VariantInput {
  attributes: Record<string, unknown>;
  price: number;
  sku?: string | null | undefined;
  stockQuantity?: number | null | undefined;
  isAvailable: boolean;
}

interface ComponentInput {
  name: string;
  defaultQty: number;
  minQty: number;
  maxQty?: number | null | undefined;
  unitPrice?: number | null | undefined;
  isRequired: boolean;
}

export async function createCatalogItem(
  vendorId: string,
  data: {
    title: string;
    slug: string;
    description?: string | null | undefined;
    basePrice?: number | null | undefined;
    isCustomizable: boolean;
    isActive: boolean;
    mediaIds?: string[] | undefined;
    variants?: VariantInput[] | undefined;
    components?: ComponentInput[] | undefined;
    collectionIds?: string[] | undefined;
  },
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.catalogItem.create({
      data: {
        vendorId,
        title: data.title,
        slug: data.slug,
        description: data.description ?? null,
        basePrice: data.basePrice != null ? new Prisma.Decimal(data.basePrice) : null,
        isCustomizable: data.isCustomizable,
        isActive: data.isActive,
      },
    });

    if (data.mediaIds && data.mediaIds.length > 0) {
      await tx.catalogItemMedia.createMany({
        data: data.mediaIds.map((mediaId, index) => ({ itemId: item.id, mediaId, sortOrder: index })),
      });
    }

    if (data.variants && data.variants.length > 0) {
      await tx.catalogItemVariant.createMany({
        data: data.variants.map((v, index) => ({
          itemId: item.id,
          attributes: v.attributes as Prisma.InputJsonValue,
          price: new Prisma.Decimal(v.price),
          sku: v.sku ?? null,
          stockQuantity: v.stockQuantity ?? null,
          isAvailable: v.isAvailable,
          sortOrder: index,
        })),
      });
    }

    if (data.components && data.components.length > 0) {
      await tx.catalogItemComponent.createMany({
        data: data.components.map((c, index) => ({
          itemId: item.id,
          name: c.name,
          defaultQty: c.defaultQty,
          minQty: c.minQty,
          maxQty: c.maxQty ?? null,
          unitPrice: c.unitPrice != null ? new Prisma.Decimal(c.unitPrice) : null,
          isRequired: c.isRequired,
          sortOrder: index,
        })),
      });
    }

    if (data.collectionIds && data.collectionIds.length > 0) {
      await tx.catalogItemCollection.createMany({
        data: data.collectionIds.map((collectionId) => ({ itemId: item.id, collectionId })),
      });
    }

    return item;
  });
}

export async function updateCatalogItem(
  id: string,
  data: {
    title?: string | undefined;
    description?: string | null | undefined;
    basePrice?: number | null | undefined;
    isCustomizable?: boolean | undefined;
    isActive?: boolean | undefined;
    sortOrder?: number | undefined;
    mediaIds?: string[] | undefined;
    variants?: VariantInput[] | undefined;
    components?: ComponentInput[] | undefined;
    collectionIds?: string[] | undefined;
  },
) {
  return prisma.$transaction(async (tx) => {
    const fields: Prisma.CatalogItemUpdateInput = omitUndefined({
      title: data.title,
      description: data.description,
      basePrice: data.basePrice !== undefined ? (data.basePrice != null ? new Prisma.Decimal(data.basePrice) : null) : undefined,
      isCustomizable: data.isCustomizable,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });

    const item = await tx.catalogItem.update({ where: { id }, data: fields });

    if (data.mediaIds !== undefined) {
      await tx.catalogItemMedia.deleteMany({ where: { itemId: id } });
      if (data.mediaIds.length > 0) {
        await tx.catalogItemMedia.createMany({
          data: data.mediaIds.map((mediaId, index) => ({ itemId: id, mediaId, sortOrder: index })),
        });
      }
    }

    if (data.variants !== undefined) {
      await tx.catalogItemVariant.deleteMany({ where: { itemId: id } });
      if (data.variants.length > 0) {
        await tx.catalogItemVariant.createMany({
          data: data.variants.map((v, index) => ({
            itemId: id,
            attributes: v.attributes as Prisma.InputJsonValue,
            price: new Prisma.Decimal(v.price),
            sku: v.sku ?? null,
            stockQuantity: v.stockQuantity ?? null,
            isAvailable: v.isAvailable,
            sortOrder: index,
          })),
        });
      }
    }

    if (data.components !== undefined) {
      await tx.catalogItemComponent.deleteMany({ where: { itemId: id } });
      if (data.components.length > 0) {
        await tx.catalogItemComponent.createMany({
          data: data.components.map((c, index) => ({
            itemId: id,
            name: c.name,
            defaultQty: c.defaultQty,
            minQty: c.minQty,
            maxQty: c.maxQty ?? null,
            unitPrice: c.unitPrice != null ? new Prisma.Decimal(c.unitPrice) : null,
            isRequired: c.isRequired,
            sortOrder: index,
          })),
        });
      }
    }

    if (data.collectionIds !== undefined) {
      await tx.catalogItemCollection.deleteMany({ where: { itemId: id } });
      if (data.collectionIds.length > 0) {
        await tx.catalogItemCollection.createMany({
          data: data.collectionIds.map((collectionId) => ({ itemId: id, collectionId })),
        });
      }
    }

    return item;
  });
}

export function deleteCatalogItem(id: string) {
  return prisma.catalogItem.delete({ where: { id } });
}

// ---- Availability ----

// Prisma's compound-unique upsert (`itemId_variantId_date`) requires a
// non-null variantId — Postgres treats NULL as never-equal for uniqueness,
// so the "applies to the whole item" (variantId null) rows aren't reachable
// through that key at all. Fall back to findFirst + create/update for that
// case; use the real compound-key upsert whenever a variantId is given.
export function setAvailability(
  itemId: string,
  variantId: string | null,
  dates: string[],
  status: CatalogAvailabilityStatus,
  note: string | null,
) {
  if (variantId) {
    const vid = variantId;
    return prisma.$transaction(
      dates.map((date) =>
        prisma.catalogItemAvailability.upsert({
          where: { itemId_variantId_date: { itemId, variantId: vid, date: new Date(date) } },
          create: { itemId, variantId: vid, date: new Date(date), status, note },
          update: { status, note },
        }),
      ),
    );
  }

  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const date of dates) {
      const parsedDate = new Date(date);
      const existing = await tx.catalogItemAvailability.findFirst({
        where: { itemId, variantId: null, date: parsedDate },
      });
      results.push(
        existing
          ? await tx.catalogItemAvailability.update({ where: { id: existing.id }, data: { status, note } })
          : await tx.catalogItemAvailability.create({
              data: { itemId, variantId: null, date: parsedDate, status, note },
            }),
      );
    }
    return results;
  });
}

export function clearAvailability(itemId: string, variantId: string | null, dates: string[]) {
  return prisma.catalogItemAvailability.deleteMany({
    where: {
      itemId,
      variantId,
      date: { in: dates.map((d) => new Date(d)) },
    },
  });
}

export function findAvailability(itemId: string, from?: Date, to?: Date) {
  return prisma.catalogItemAvailability.findMany({
    where: {
      itemId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "asc" },
  });
}

// ---- Admin: per-category variant field configuration ----

export function findVariantFieldsByCategoryId(categoryId: string) {
  return prisma.categoryCatalogVariantField.findMany({
    where: { categoryId },
    orderBy: { sortOrder: "asc" },
  });
}

export function createVariantField(
  categoryId: string,
  data: {
    key: string;
    label: string;
    dataType: AttributeDataType;
    options?: unknown;
    isRequired: boolean;
    sortOrder: number;
  },
) {
  const optionsField = omitUndefined({ options: data.options as Prisma.InputJsonValue | undefined });
  return prisma.categoryCatalogVariantField.create({
    data: {
      categoryId,
      key: data.key,
      label: data.label,
      dataType: data.dataType,
      isRequired: data.isRequired,
      sortOrder: data.sortOrder,
      ...optionsField,
    },
  });
}

export function findVariantFieldById(id: string) {
  return prisma.categoryCatalogVariantField.findUnique({ where: { id } });
}

export function updateVariantField(
  id: string,
  data: {
    label?: string | undefined;
    dataType?: AttributeDataType | undefined;
    options?: unknown;
    isRequired?: boolean | undefined;
    sortOrder?: number | undefined;
  },
) {
  const fields = omitUndefined({
    label: data.label,
    dataType: data.dataType,
    options: data.options as Prisma.InputJsonValue | undefined,
    isRequired: data.isRequired,
    sortOrder: data.sortOrder,
  });
  return prisma.categoryCatalogVariantField.update({ where: { id }, data: fields });
}

export function deleteVariantField(id: string) {
  return prisma.categoryCatalogVariantField.delete({ where: { id } });
}

export function reorderVariantFields(categoryId: string, fieldIds: string[]) {
  return prisma.$transaction(
    fieldIds.map((id, index) =>
      prisma.categoryCatalogVariantField.update({
        where: { id, categoryId },
        data: { sortOrder: index },
      }),
    ),
  );
}

// ---- Public catalog page settings ----

const MEDIA_SELECT = {
  id: true,
  originalObjectKey: true,
  optimizedObjectKey: true,
} satisfies Prisma.MediaSelect;

const STORE_SETTINGS_INCLUDE = {
  heroMedia: { include: { media: { select: MEDIA_SELECT } }, orderBy: { sortOrder: "asc" as const } },
  galleryMedia: { include: { media: { select: MEDIA_SELECT } }, orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.CatalogStoreSettingsInclude;

export function findStoreSettingsByVendorId(vendorId: string) {
  return prisma.catalogStoreSettings.findUnique({
    where: { vendorId },
    include: STORE_SETTINGS_INCLUDE,
  });
}

export interface UpsertStoreSettingsData {
  heroMediaIds?: string[] | undefined;
  galleryMediaIds?: string[] | undefined;
  heroHeadline?: string | null | undefined;
  heroTagline?: string | null | undefined;
  heroSubtitle?: string | null | undefined;
  announcementText?: string | null | undefined;
  shopButtonText?: string | null | undefined;
  trialButtonText?: string | null | undefined;
  accentColor?: StoreAccentColor | undefined;
  categorySectionHeading?: string | null | undefined;
  categorySectionSubheading?: string | null | undefined;
  featuredSectionHeading?: string | null | undefined;
  featuredSectionSubheading?: string | null | undefined;
  promoEyebrow?: string | null | undefined;
  promoHeading?: string | null | undefined;
  promoDescription?: string | null | undefined;
  promoQuote?: string | null | undefined;
  galleryHeading?: string | null | undefined;
  gallerySubheading?: string | null | undefined;
  instagramUrl?: string | null | undefined;
  trustBadges?: { title: string; subtitle: string }[] | null | undefined;
  footerAboutText?: string | null | undefined;
  footerQuickLinksHeading?: string | null | undefined;
  footerSupportHeading?: string | null | undefined;
  footerSocialHeading?: string | null | undefined;
  footerLinks?: { label: string; url: string }[] | null | undefined;
}

export async function upsertStoreSettings(vendorId: string, data: UpsertStoreSettingsData) {
  const { heroMediaIds, galleryMediaIds, ...rest } = data;
  const fields = omitUndefined({
    ...rest,
    trustBadges: rest.trustBadges as Prisma.InputJsonValue | undefined,
    footerLinks: rest.footerLinks as Prisma.InputJsonValue | undefined,
  });

  return prisma.$transaction(async (tx) => {
    const settings = await tx.catalogStoreSettings.upsert({
      where: { vendorId },
      create: { vendorId, ...fields },
      update: fields,
    });

    if (heroMediaIds !== undefined) {
      await tx.catalogStoreHeroMedia.deleteMany({ where: { settingsId: settings.id } });
      if (heroMediaIds.length > 0) {
        await tx.catalogStoreHeroMedia.createMany({
          data: heroMediaIds.map((mediaId, index) => ({ settingsId: settings.id, mediaId, sortOrder: index })),
        });
      }
    }

    if (galleryMediaIds !== undefined) {
      await tx.catalogStoreGalleryMedia.deleteMany({ where: { settingsId: settings.id } });
      if (galleryMediaIds.length > 0) {
        await tx.catalogStoreGalleryMedia.createMany({
          data: galleryMediaIds.map((mediaId, index) => ({ settingsId: settings.id, mediaId, sortOrder: index })),
        });
      }
    }

    return tx.catalogStoreSettings.findUniqueOrThrow({
      where: { id: settings.id },
      include: STORE_SETTINGS_INCLUDE,
    });
  });
}

// ---- Vendor-defined merchandising collections ----

const COLLECTION_INCLUDE = {
  coverMedia: { select: MEDIA_SELECT },
} satisfies Prisma.CatalogCollectionInclude;

export function findCollectionsByVendorId(vendorId: string) {
  return prisma.catalogCollection.findMany({
    where: { vendorId },
    orderBy: { sortOrder: "asc" },
    include: COLLECTION_INCLUDE,
  });
}

export function findCollectionById(id: string) {
  return prisma.catalogCollection.findUnique({ where: { id } });
}

export async function createCollection(vendorId: string, name: string, slug: string, coverMediaId?: string | null) {
  const maxSortOrder = await prisma.catalogCollection.aggregate({
    where: { vendorId },
    _max: { sortOrder: true },
  });
  return prisma.catalogCollection.create({
    data: {
      vendorId,
      name,
      slug,
      coverMediaId: coverMediaId ?? null,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
    include: COLLECTION_INCLUDE,
  });
}

export function updateCollection(
  id: string,
  data: { name?: string | undefined; sortOrder?: number | undefined; coverMediaId?: string | null | undefined },
) {
  return prisma.catalogCollection.update({ where: { id }, data: omitUndefined(data), include: COLLECTION_INCLUDE });
}

export function deleteCollection(id: string) {
  return prisma.catalogCollection.delete({ where: { id } });
}

export function reorderCollections(vendorId: string, orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.catalogCollection.update({
        where: { id, vendorId },
        data: { sortOrder: index },
      }),
    ),
  );
}

// Public: items grouped by collection for the "Shop by Category" grid + tab
// filters — only active items, only collections that have at least one.
export function findPublicCollectionsWithItems(vendorId: string) {
  return prisma.catalogCollection.findMany({
    where: { vendorId, items: { some: { item: { isActive: true } } } },
    orderBy: { sortOrder: "asc" },
    include: {
      coverMedia: { select: MEDIA_SELECT },
      items: {
        where: { item: { isActive: true } },
        include: {
          item: {
            include: ITEM_INCLUDE,
          },
        },
      },
    },
  });
}
