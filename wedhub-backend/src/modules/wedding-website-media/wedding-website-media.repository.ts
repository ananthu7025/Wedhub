import { prisma } from "../../config/database";

export function findOwnedDraft(weddingWebsiteId: string, ownerUserId: string) {
  return prisma.weddingWebsite.findFirst({ where: { id: weddingWebsiteId, ownerUserId }, select: { id: true } });
}

export function createUnattachedPhoto(data: { weddingWebsiteId: string; originalObjectKey: string; mimeType: string; fileSize: number }) {
  return prisma.media.create({
    data: {
      weddingWebsiteId: data.weddingWebsiteId,
      mediaType: "WEDDING_WEBSITE_PHOTO",
      originalObjectKey: data.originalObjectKey,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      // Owner-uploaded content, same as REVIEW_PHOTO — no moderation queue
      // exists for this media type, so approving it here would be
      // meaningless; moderationStatus stays at its PENDING default and is
      // simply never read for WEDDING_WEBSITE_PHOTO.
    },
  });
}

export function findPhotoById(id: string) {
  return prisma.media.findUnique({ where: { id } });
}

export function markProcessing(id: string) {
  return prisma.media.update({ where: { id }, data: { status: "PROCESSING" } });
}

export function countPhotosForWebsite(weddingWebsiteId: string) {
  return prisma.media.count({
    where: { weddingWebsiteId, mediaType: "WEDDING_WEBSITE_PHOTO", status: { not: "DELETED" } },
  });
}

export function deletePhoto(id: string) {
  return prisma.media.update({ where: { id }, data: { status: "DELETED" } });
}
