import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { NotFoundError, ValidationError } from "../../common/errors";
import { getSignedUploadUrl, getPublicUrl, objectExists } from "../../integrations/storage/r2.client";
import { enqueueMediaProcessing } from "../../jobs/queues/media-processing.queue";
import * as adminMediaRepository from "./admin-media.repository";

function extensionFor(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

/**
 * Admin-only, platform-owned image uploads (e.g. a Category's homepage
 * image) — a small, unmoderated, no-entitlement-check parallel to the
 * vendor media pipeline (media.service.ts), same shape as
 * review-media.service.ts's REVIEW_PHOTO path: deliberately not routed
 * through media.service.ts, since that module is built around a required
 * Media.vendorId and entitlement checks that don't apply here. Reuses the
 * same R2 client and media-processing queue/worker (both keyed generically
 * by mediaId, no vendor assumption).
 */
export async function createUploadRequest(input: { filename: string; mimeType: string; fileSize: number }) {
  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const objectKey = `platform/category-images/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await adminMediaRepository.createUnattachedImage({
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmUpload(mediaId: string) {
  const media = await adminMediaRepository.findImageById(mediaId);
  if (!media || media.mediaType !== "CATEGORY_IMAGE") {
    throw new NotFoundError("Media not found");
  }
  if (media.status !== "PENDING") {
    return toPublicView(media); // already confirmed — idempotent from the caller's point of view
  }

  const exists = await objectExists(media.originalObjectKey);
  if (!exists) {
    throw new ValidationError("Upload not found in storage yet — has the browser upload completed?");
  }

  await adminMediaRepository.markProcessing(mediaId);
  await enqueueMediaProcessing(mediaId);
  const updated = await adminMediaRepository.findImageById(mediaId);
  return updated ? toPublicView(updated) : null;
}

// Category.imageUrl needs a resolvable URL, not an objectKey — same
// resolution media.service.ts's toPublicView uses (optimized, falling
// back to nothing until processing completes).
function toPublicView(media: { id: string; status: string; optimizedObjectKey: string | null }) {
  return {
    id: media.id,
    status: media.status,
    url: media.optimizedObjectKey ? getPublicUrl(media.optimizedObjectKey) : null,
  };
}
