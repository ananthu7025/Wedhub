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

// Arch Phase 17 — lets an admin browse real, public vendor albums to pick
// from when curating the homepage's "Real Wedding Stories" section
// (wedding-stories module). No cross-vendor album list existed before;
// albums were only ever listable per-vendor (own or by slug).
export function listAllPublicAlbumsAdmin() {
  return prisma.album.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { id: true, businessName: true, slug: true } },
      coverMedia: true,
    },
  });
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

// The vendor dashboard's Portfolio manager (PortfolioManager.tsx) uploads
// PORTFOLIO/VIDEO media directly, with no album-picker UI — it never sets
// Media.albumId. Without this, that media would never appear on the
// public portfolio page at all, since listPublicVendorAlbums only walks
// Album.media. Scoped to albumId: null so a photo the vendor DID organize
// into a public album isn't double-counted here too.
export function listPublicVendorPortfolioMedia(vendorId: string) {
  return prisma.media.findMany({
    where: {
      vendorId,
      albumId: null,
      mediaType: { in: ["PORTFOLIO", "VIDEO"] },
      status: "READY",
      moderationStatus: "APPROVED",
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
