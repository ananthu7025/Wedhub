import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function findCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, isActive: true, imageUrl: true },
  });
}

export function findLocationById(id: string) {
  return prisma.location.findUnique({ where: { id }, select: { id: true, name: true, slug: true, type: true, isActive: true } });
}

// Same real-vendor gate search.repository.ts's buildWhere() uses
// (status APPROVED, not soft-deleted) — an SEO page's "meaningful vendor
// inventory" must be the same set /search/vendors would actually return
// for this categoryId/cityId, not a looser count.
export function countVendors(categoryId: string | undefined, cityId: string | undefined) {
  return prisma.vendor.count({
    where: {
      status: "APPROVED",
      deletedAt: null,
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      ...(cityId ? { cityId } : {}),
    },
  });
}

export function findOverride(pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY", categoryId: string | null, locationId: string | null) {
  return prisma.seoOverride.findFirst({
    where: { pageType, categoryId, locationId },
  });
}

const OVERRIDE_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  location: { select: { id: true, name: true, slug: true, type: true } },
} as const;

export function findAllOverrides(pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY" | undefined) {
  return prisma.seoOverride.findMany({
    where: omitUndefined({ pageType }),
    orderBy: { createdAt: "desc" },
    include: OVERRIDE_INCLUDE,
  });
}

export function findOverrideById(id: string) {
  return prisma.seoOverride.findUnique({ where: { id }, include: OVERRIDE_INCLUDE });
}

export function createOverride(data: {
  pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY";
  categoryId: string | null;
  locationId: string | null;
  title: string | undefined;
  description: string | undefined;
  ogImageUrl: string | undefined;
  noIndex: boolean | undefined;
}) {
  const fields = omitUndefined({
    title: data.title,
    description: data.description,
    ogImageUrl: data.ogImageUrl,
    noIndex: data.noIndex,
  });
  return prisma.seoOverride.create({
    data: { pageType: data.pageType, categoryId: data.categoryId, locationId: data.locationId, ...fields },
    include: OVERRIDE_INCLUDE,
  });
}

export interface SeoOverrideUpdateFields {
  title: string | null | undefined;
  description: string | null | undefined;
  ogImageUrl: string | null | undefined;
  noIndex: boolean | undefined;
}

export function updateOverride(id: string, data: SeoOverrideUpdateFields) {
  return prisma.seoOverride.update({ where: { id }, data: omitUndefined(data), include: OVERRIDE_INCLUDE });
}

export function deleteOverride(id: string) {
  return prisma.seoOverride.delete({ where: { id } });
}

// Enumerates every real category and every real CITY-type location for
// the sitemap-combinations endpoint — combinations with insufficient
// vendor inventory get filtered by indexability in the service layer, not
// here, since that check needs the same countVendors() logic per pair.
export function findAllActiveCategories() {
  return prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
}

export function findAllActiveCities() {
  return prisma.location.findMany({
    where: { isActive: true, type: "CITY" },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}
