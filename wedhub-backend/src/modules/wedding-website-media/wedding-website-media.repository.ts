import { prisma } from "../../config/database";

export function findOwnedDraft(weddingWebsiteId: string, ownerUserId: string) {
  return prisma.weddingWebsite.findFirst({ where: { id: weddingWebsiteId, ownerUserId }, select: { id: true } });
}

// Telegram-owned counterpart — needed for the bot's WW_COLLECTING_PHOTOS
// state (Arch Phase 26). Kept as a separate, explicitly-named function
// rather than overloading findOwnedDraft's second parameter, since the
// two owner columns are genuinely different Prisma where-clauses.
export function findOwnedDraftForTelegramUser(weddingWebsiteId: string, ownerTelegramUserId: string) {
  return prisma.weddingWebsite.findFirst({ where: { id: weddingWebsiteId, ownerTelegramUserId }, select: { id: true } });
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
