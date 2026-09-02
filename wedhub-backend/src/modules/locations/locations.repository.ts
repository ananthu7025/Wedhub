import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";
import type { ListLocationsFilter } from "./locations.types";

export function findLocations(filter: ListLocationsFilter) {
  const where: Prisma.LocationWhereInput = { isActive: true };
  if (filter.type) {
    where.type = filter.type;
  }
  if (filter.parentId !== undefined) {
    where.parentId = filter.parentId;
  }

  return prisma.location.findMany({ where, orderBy: { name: "asc" } });
}

// Admin-only counterpart to findLocations — omits the isActive filter so a
// disabled location remains visible/re-enable-able. See
// locations.controller.ts's listLocations for the ADMIN-only gate.
export function findAllLocationsForAdmin(filter: ListLocationsFilter) {
  const where: Prisma.LocationWhereInput = {};
  if (filter.type) {
    where.type = filter.type;
  }
  if (filter.parentId !== undefined) {
    where.parentId = filter.parentId;
  }

  return prisma.location.findMany({ where, orderBy: { name: "asc" } });
}

export function findLocationById(id: string) {
  return prisma.location.findUnique({ where: { id } });
}

export function findLocationBySlugAndParent(slug: string, parentId: string | undefined) {
  return prisma.location.findFirst({ where: { slug, parentId: parentId ?? null } });
}

export function createLocation(data: {
  type: string;
  name: string;
  slug: string;
  parentId: string | undefined;
}) {
  const fields = omitUndefined({ parentId: data.parentId });
  return prisma.location.create({
    data: {
      type: data.type as Prisma.LocationCreateInput["type"],
      name: data.name,
      slug: data.slug,
      ...fields,
    },
  });
}

export interface LocationUpdateFields {
  name: string | undefined;
  isActive: boolean | undefined;
}

export function updateLocation(id: string, data: LocationUpdateFields) {
  return prisma.location.update({ where: { id }, data: omitUndefined(data) });
}
