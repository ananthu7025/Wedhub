import { prisma } from "../../config/database";

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

export function markProcessing(id: string) {
  return prisma.media.update({ where: { id }, data: { status: "PROCESSING" } });
}
