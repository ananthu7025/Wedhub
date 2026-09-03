import type { MediaModerationStatus, MediaStatus, MediaType } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function createMedia(data: {
  vendorId: string;
  albumId: string | undefined;
  mediaType: string;
  originalObjectKey: string;
  mimeType: string;
  fileSize: number;
}) {
  const fields = omitUndefined({ albumId: data.albumId });
  return prisma.media.create({
    data: {
      vendorId: data.vendorId,
      mediaType: data.mediaType as MediaType,
      originalObjectKey: data.originalObjectKey,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      ...fields,
    },
  });
}

export function findMediaById(id: string) {
  return prisma.media.findUnique({ where: { id } });
}

export function listVendorMedia(vendorId: string) {
  return prisma.media.findMany({
    where: { vendorId, status: { not: "DELETED" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

// Arch Phase 17 — lets an admin browse real, already-approved vendor
// portfolio media to pick from when curating the homepage Gallery
// Inspiration section (featured-media module). No such cross-vendor list
// existed before; media was only ever listable per-vendor.
export function listApprovedMediaAdmin(page: number, limit: number) {
  return prisma.media.findMany({
    where: { status: "READY", moderationStatus: "APPROVED", vendorId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: { vendor: { select: { id: true, businessName: true } } },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export function countApprovedMediaAdmin() {
  return prisma.media.count({ where: { status: "READY", moderationStatus: "APPROVED", vendorId: { not: null } } });
}

export function updateMediaStatus(id: string, status: string) {
  return prisma.media.update({
    where: { id },
    data: { status: status as MediaStatus },
  });
}

export interface MediaUpdateFields {
  altText: string | undefined;
  sortOrder: number | undefined;
  albumId: string | null | undefined;
}

export function updateMedia(id: string, data: MediaUpdateFields) {
  const fields = omitUndefined(data);
  return prisma.media.update({ where: { id }, data: fields });
}

export function markDeleted(id: string) {
  return prisma.media.update({ where: { id }, data: { status: "DELETED" } });
}

export function setModerationStatus(id: string, moderationStatus: string) {
  return prisma.media.update({
    where: { id },
    data: { moderationStatus: moderationStatus as MediaModerationStatus },
  });
}
