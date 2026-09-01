import type { MediaModerationStatus, MediaStatus, MediaType } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function countActivePortfolioMedia(vendorId: string) {
  return prisma.media.count({
    where: { vendorId, mediaType: "PORTFOLIO", status: { not: "DELETED" } },
  });
}

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
