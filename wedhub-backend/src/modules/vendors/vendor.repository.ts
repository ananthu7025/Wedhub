import type { Prisma, VendorStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export const VENDOR_FULL_INCLUDE = {
  profile: { include: { logoMedia: true, coverMedia: true } },
  categories: { include: { category: true } },
  serviceAreas: { include: { location: true } },
  services: { include: { service: true } },
  packages: true,
  attributeValues: { include: { attribute: true } },
  city: true,
} satisfies Prisma.VendorInclude;

// Admin-only — adds the owner account's contact info. Deliberately NOT
// merged into VENDOR_FULL_INCLUDE, which also backs the public GET
// /vendors/:slug endpoint; leaking an owner's email/phone there would be a
// real privacy issue (Frontend Arch Phase 8 research, 2026-09-02).
export const VENDOR_ADMIN_INCLUDE = {
  ...VENDOR_FULL_INCLUDE,
  owner: { select: { id: true, email: true, phone: true } },
} satisfies Prisma.VendorInclude;

export const VENDOR_COMPLETENESS_INCLUDE = {
  profile: true,
  categories: true,
  serviceAreas: true,
  services: true,
  packages: true,
  attributeValues: true,
} satisfies Prisma.VendorInclude;

export function findVendorByOwnerId(ownerUserId: string) {
  return prisma.vendor.findFirst({ where: { ownerUserId }, include: VENDOR_FULL_INCLUDE });
}

export function findVendorById(id: string) {
  return prisma.vendor.findUnique({ where: { id }, include: VENDOR_FULL_INCLUDE });
}

export function findVendorByIdForAdmin(id: string) {
  return prisma.vendor.findUnique({ where: { id }, include: VENDOR_ADMIN_INCLUDE });
}

export function findVendorForCompleteness(id: string) {
  return prisma.vendor.findUniqueOrThrow({ where: { id }, include: VENDOR_COMPLETENESS_INCLUDE });
}

export function findVendorBySlug(slug: string) {
  return prisma.vendor.findUnique({ where: { slug }, include: VENDOR_FULL_INCLUDE });
}

export function findVendorBySlugAnyCase(slug: string) {
  return prisma.vendor.findFirst({ where: { slug } });
}

export function findApprovedVendorBySlug(slug: string) {
  return prisma.vendor.findFirst({
    where: { slug, status: "APPROVED" },
    include: VENDOR_FULL_INCLUDE,
  });
}

export function listApprovedVendors(filter: {
  categoryId: string | undefined;
  cityId: string | undefined;
  page: number;
  limit: number;
}) {
  const where: Prisma.VendorWhereInput = { status: "APPROVED" };
  if (filter.cityId) {
    where.cityId = filter.cityId;
  }
  if (filter.categoryId) {
    where.categories = { some: { categoryId: filter.categoryId } };
  }

  return prisma.vendor.findMany({
    where,
    include: VENDOR_FULL_INCLUDE,
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
    orderBy: { profileCompleteness: "desc" },
  });
}

export function countApprovedVendors(filter: { categoryId: string | undefined; cityId: string | undefined }) {
  const where: Prisma.VendorWhereInput = { status: "APPROVED" };
  if (filter.cityId) {
    where.cityId = filter.cityId;
  }
  if (filter.categoryId) {
    where.categories = { some: { categoryId: filter.categoryId } };
  }
  return prisma.vendor.count({ where });
}

export function createVendor(data: {
  businessName: string;
  slug: string;
  creationSource: "SELF_REGISTERED" | "ADMIN_CREATED";
  ownerUserId: string | undefined;
}) {
  const fields = omitUndefined({ ownerUserId: data.ownerUserId });
  return prisma.vendor.create({
    data: {
      businessName: data.businessName,
      slug: data.slug,
      creationSource: data.creationSource,
      ...fields,
    },
  });
}

export interface VendorUpdateFields {
  businessName: string | undefined;
  cityId: string | undefined;
}

export function updateVendor(id: string, data: VendorUpdateFields) {
  return prisma.vendor.update({ where: { id }, data: omitUndefined(data) });
}

export function updateProfileCompleteness(id: string, score: number) {
  return prisma.vendor.update({ where: { id }, data: { profileCompleteness: score } });
}

export function upsertVendorProfile(vendorId: string, data: Record<string, unknown>) {
  const fields = omitUndefined(data);
  return prisma.vendorProfile.upsert({
    where: { vendorId },
    create: { vendorId, ...fields },
    update: fields,
  });
}

export function upsertProfileTx(
  vendorId: string,
  cityId: string | undefined,
  profileData: Record<string, unknown>,
) {
  const profileFields = omitUndefined(profileData);
  const writes = [];
  if (cityId !== undefined) {
    writes.push(prisma.vendor.update({ where: { id: vendorId }, data: { cityId } }));
  }
  writes.push(
    prisma.vendorProfile.upsert({
      where: { vendorId },
      create: { vendorId, ...profileFields },
      update: profileFields,
    }),
  );
  return prisma.$transaction(writes);
}

// Ownership+readiness check for setting VendorProfile.logoMediaId/coverMediaId
// (PUT /vendors/me/profile) — Media itself belongs to the media module, but
// this is a same-database Prisma read, not a cross-module service call.
export function findOwnMediaById(vendorId: string, mediaId: string) {
  return prisma.media.findFirst({ where: { id: mediaId, vendorId }, select: { id: true, status: true } });
}

export function replaceVendorCategories(
  vendorId: string,
  primaryCategoryId: string,
  subcategoryIds: string[],
) {
  const allIds = Array.from(new Set([primaryCategoryId, ...subcategoryIds]));
  return prisma.$transaction([
    prisma.vendorCategory.deleteMany({ where: { vendorId } }),
    prisma.vendorCategory.createMany({
      data: allIds.map((categoryId) => ({
        vendorId,
        categoryId,
        isPrimary: categoryId === primaryCategoryId,
      })),
    }),
  ]);
}

export function getCurrentPrimaryCategoryId(vendorId: string) {
  return prisma.vendorCategory.findFirst({ where: { vendorId, isPrimary: true } });
}

export function replaceVendorServiceAreas(vendorId: string, locationIds: string[]) {
  return prisma.$transaction([
    prisma.vendorServiceArea.deleteMany({ where: { vendorId } }),
    prisma.vendorServiceArea.createMany({
      data: locationIds.map((locationId) => ({ vendorId, locationId })),
    }),
  ]);
}

export function findAttributesByIds(attributeIds: string[]) {
  return prisma.categoryAttribute.findMany({ where: { id: { in: attributeIds } } });
}

export interface AttributeValueRow {
  attributeId: string;
  valueText: string | undefined;
  valueNumber: number | undefined;
  valueBoolean: boolean | undefined;
  valueOptions: string[] | undefined;
}

export function replaceAttributeValues(vendorId: string, rows: AttributeValueRow[]) {
  return prisma.$transaction([
    prisma.vendorAttributeValue.deleteMany({ where: { vendorId } }),
    prisma.vendorAttributeValue.createMany({
      data: rows.map((row) => ({
        vendorId,
        attributeId: row.attributeId,
        ...omitUndefined({
          valueText: row.valueText,
          valueNumber: row.valueNumber,
          valueBoolean: row.valueBoolean,
          valueOptions: row.valueOptions,
        }),
      })),
    }),
  ]);
}

export function findServiceById(serviceId: string) {
  return prisma.service.findUnique({ where: { id: serviceId } });
}

export function attachService(vendorId: string, serviceId: string, note: string | undefined) {
  const fields = omitUndefined({ note });
  return prisma.vendorService.upsert({
    where: { vendorId_serviceId: { vendorId, serviceId } },
    create: { vendorId, serviceId, ...fields },
    update: fields,
  });
}

export function detachService(vendorId: string, serviceId: string) {
  return prisma.vendorService.delete({ where: { vendorId_serviceId: { vendorId, serviceId } } });
}

export function createPackage(vendorId: string, data: {
  name: string;
  description: string | undefined;
  price: number;
  currency: string | undefined;
  inclusions: string[] | undefined;
}) {
  const fields = omitUndefined({
    description: data.description,
    currency: data.currency,
    inclusions: data.inclusions,
  });
  return prisma.package.create({
    data: { vendorId, name: data.name, price: data.price, ...fields },
  });
}

export interface PackageUpdateFields {
  name: string | undefined;
  description: string | undefined;
  price: number | undefined;
  currency: string | undefined;
  inclusions: string[] | undefined;
  sortOrder: number | undefined;
  isActive: boolean | undefined;
}

export function findPackageById(packageId: string) {
  return prisma.package.findUnique({ where: { id: packageId } });
}

export function updatePackage(packageId: string, data: PackageUpdateFields) {
  return prisma.package.update({ where: { id: packageId }, data: omitUndefined(data) });
}

export function deletePackage(packageId: string) {
  return prisma.package.delete({ where: { id: packageId } });
}

export function recordStatusChange(input: {
  vendorId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | undefined;
  changedByUserId: string | undefined;
}) {
  const optionalFields = omitUndefined({ reason: input.reason, changedByUserId: input.changedByUserId });
  return prisma.vendorStatusHistory.create({
    data: {
      vendorId: input.vendorId,
      fromStatus: input.fromStatus as VendorStatus | null,
      toStatus: input.toStatus as Prisma.VendorStatusHistoryCreateInput["toStatus"],
      ...optionalFields,
    },
  });
}

export function findStatusHistory(vendorId: string) {
  return prisma.vendorStatusHistory.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
  });
}
