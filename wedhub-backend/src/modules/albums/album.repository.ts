import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function createAlbum(data: {
  vendorId: string;
  name: string;
  description: string | undefined;
  visibility: string | undefined;
}) {
  const fields = omitUndefined({
    description: data.description,
    visibility: data.visibility as Prisma.AlbumCreateInput["visibility"] | undefined,
  });
  return prisma.album.create({ data: { vendorId: data.vendorId, name: data.name, ...fields } });
}

export function findAlbumById(id: string) {
  return prisma.album.findUnique({ where: { id }, include: { media: true } });
}

export function listVendorAlbums(vendorId: string) {
  return prisma.album.findMany({
    where: { vendorId },
    orderBy: { sortOrder: "asc" },
    include: { media: { where: { status: { not: "DELETED" } } } },
  });
}

export function listPublicVendorAlbums(vendorId: string) {
  return prisma.album.findMany({
    where: { vendorId, visibility: "PUBLIC" },
    orderBy: { sortOrder: "asc" },
    include: {
      media: { where: { status: "READY", moderationStatus: "APPROVED" } },
    },
  });
}

export interface AlbumUpdateFields {
  name: string | undefined;
  description: string | undefined;
  coverMediaId: string | undefined;
  visibility: string | undefined;
  sortOrder: number | undefined;
}

export function updateAlbum(id: string, data: AlbumUpdateFields) {
  const fields = omitUndefined({
    name: data.name,
    description: data.description,
    coverMediaId: data.coverMediaId,
    visibility: data.visibility as Prisma.AlbumUpdateInput["visibility"] | undefined,
    sortOrder: data.sortOrder,
  });
  return prisma.album.update({ where: { id }, data: fields });
}

export function deleteAlbum(id: string) {
  return prisma.$transaction([
    prisma.media.updateMany({ where: { albumId: id }, data: { albumId: null } }),
    prisma.album.delete({ where: { id } }),
  ]);
}
