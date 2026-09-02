import { prisma } from "../../config/database";

export function createUnattachedPhoto(data: {
  userId: string;
  originalObjectKey: string;
  mimeType: string;
  fileSize: number;
}) {
  return prisma.media.create({
    data: {
      userId: data.userId,
      mediaType: "REVIEW_PHOTO",
      originalObjectKey: data.originalObjectKey,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    },
  });
}

export function findPhotoById(id: string) {
  return prisma.media.findUnique({ where: { id } });
}

export function markProcessing(id: string) {
  return prisma.media.update({ where: { id }, data: { status: "PROCESSING" } });
}

export function countMyUnattachedPendingPhotos(userId: string) {
  return prisma.media.count({
    where: { userId, mediaType: "REVIEW_PHOTO", reviewId: null, status: { not: "DELETED" } },
  });
}

export function attachPhotosToReview(mediaIds: string[], reviewId: string, userId: string) {
  // updateMany rather than N individual updates — also double-checks
  // ownership (userId) and reviewId: null (not already attached elsewhere)
  // in the WHERE clause itself, so a caller can't hijack someone else's
  // uploaded-but-unattached photo by guessing its id.
  return prisma.media.updateMany({
    where: { id: { in: mediaIds }, userId, reviewId: null, mediaType: "REVIEW_PHOTO" },
    data: { reviewId },
  });
}
