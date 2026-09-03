import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function createUnattachedImage(data: { originalObjectKey: string; mimeType: string; fileSize: number }) {
  return prisma.media.create({
    data: {
      mediaType: "CATEGORY_IMAGE",
      originalObjectKey: data.originalObjectKey,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    },
  });
}

export function findImageById(id: string) {
  return prisma.media.findUnique({ where: { id } });
}

export function findVendorForUpload(vendorId: string) {
  return prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
}

export function markProcessing(id: string) {
  return prisma.media.update({ where: { id }, data: { status: "PROCESSING" } });
}

// Real PORTFOLIO media, owned by a real vendor, just uploaded by an admin
// on that vendor's behalf — same shape media.repository.ts's createMedia
// produces for a vendor's own upload, plus moderationStatus: APPROVED set
// immediately (admin-sourced content doesn't need an admin to moderate
// itself; see admin-media.service.ts's createVendorUploadRequest).
export function createVendorMedia(data: {
  vendorId: string;
  albumId: string | undefined;
  originalObjectKey: string;
  mimeType: string;
  fileSize: number;
}) {
  const fields = omitUndefined({ albumId: data.albumId });
  return prisma.media.create({
    data: {
      vendorId: data.vendorId,
      mediaType: "PORTFOLIO",
      originalObjectKey: data.originalObjectKey,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      moderationStatus: "APPROVED",
      ...fields,
    },
  });
}
