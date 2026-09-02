import { prisma } from "../../config/database";
import type { MediaType } from "@prisma/client";

export function countActiveMedia(vendorId: string, mediaType: MediaType) {
  return prisma.media.count({
    where: { vendorId, mediaType, status: "READY" },
  });
}

// Oldest-first: when trimming to a lower limit, the vendor's most recently
// added items are the ones most likely to matter to them right now.
export function listActiveMediaOldestFirst(vendorId: string, mediaType: MediaType) {
  return prisma.media.findMany({
    where: { vendorId, mediaType, status: "READY" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

// Entitlement-hidden only (status=INACTIVE) — distinct from FAILED/DELETED,
// and distinct from moderationStatus=HIDDEN which is a moderator action on
// a different axis. Oldest-hidden-first mirrors the downgrade sweep so a
// re-upgrade restores items in the same order they were taken away.
export function listInactiveMediaOldestFirst(vendorId: string, mediaType: MediaType) {
  return prisma.media.findMany({
    where: { vendorId, mediaType, status: "INACTIVE" },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });
}

export function setMediaStatuses(mediaIds: string[], status: "READY" | "INACTIVE") {
  if (mediaIds.length === 0) {
    return Promise.resolve({ count: 0 });
  }
  return prisma.media.updateMany({
    where: { id: { in: mediaIds } },
    data: { status },
  });
}
