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
      mediaType: "CHALLENGE_ENTRY_PHOTO",
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
    where: { userId, mediaType: "CHALLENGE_ENTRY_PHOTO", vendorId: null, status: { not: "DELETED" } },
  });
}

// Ownership + "not already attached to another entry" guard, checked at
// submission time — same shape as review-media's attachPhotosToReview,
// preventing a caller from hijacking someone else's uploaded-but-unattached
// photo by guessing its id. A photo counts as attached once its Media row
// has a vendorId (set atomically alongside entry/photo-join creation in
// challenge-entry.service.ts's submitEntry transaction).
export function findOwnUnattachedPhoto(userId: string, mediaId: string) {
  return prisma.media.findFirst({
    where: { id: mediaId, userId, vendorId: null, mediaType: "CHALLENGE_ENTRY_PHOTO", status: "READY" },
  });
}

export function countOwnUnattachedPhotos(userId: string, mediaIds: string[]) {
  return prisma.media.count({
    where: { id: { in: mediaIds }, userId, vendorId: null, mediaType: "CHALLENGE_ENTRY_PHOTO", status: "READY" },
  });
}
