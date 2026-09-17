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
      mediaType: "COMMUNITY_POST_PHOTO",
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
    where: { userId, mediaType: "COMMUNITY_POST_PHOTO", communityPostId: null, status: { not: "DELETED" } },
  });
}

export function attachPhotoToPost(mediaId: string, communityPostId: string, userId: string) {
  // updateMany, same reasoning as review-media.repository.ts::
  // attachPhotosToReview — the WHERE clause itself double-checks ownership
  // and not-already-attached, so a caller can't hijack someone else's
  // uploaded-but-unattached photo by guessing its id.
  return prisma.media.updateMany({
    where: { id: mediaId, userId, communityPostId: null, mediaType: "COMMUNITY_POST_PHOTO" },
    data: { communityPostId },
  });
}
