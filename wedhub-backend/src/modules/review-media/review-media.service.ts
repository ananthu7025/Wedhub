import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { NotFoundError, ValidationError } from "../../common/errors";
import { getSignedUploadUrl, objectExists } from "../../integrations/storage/r2.client";
import { enqueueMediaProcessing } from "../../jobs/queues/media-processing.queue";
import * as reviewMediaRepository from "./review-media.repository";
import { MAX_PHOTOS_PER_REVIEW } from "./review-media.schema";

function extensionFor(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

/**
 * Review photos are a small, unmoderated, no-entitlement-check parallel to
 * the vendor media pipeline (media.service.ts) — deliberately not routed
 * through that module, since it's built around getOwnedVendorOrThrow(userId)
 * and a required Media.vendorId, neither of which applies to a couple
 * uploading a review photo. Reuses the same R2 client and media-processing
 * queue/worker (both keyed generically by mediaId, no vendor assumption).
 */
export async function createUploadRequest(
  userId: string,
  input: { filename: string; mimeType: string; fileSize: number },
) {
  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(
      `File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`,
    );
  }

  const existingCount = await reviewMediaRepository.countMyUnattachedPendingPhotos(userId);
  if (existingCount >= MAX_PHOTOS_PER_REVIEW) {
    throw new ValidationError(`You can attach up to ${MAX_PHOTOS_PER_REVIEW} photos to a review`);
  }

  const objectKey = `review-photos/${userId}/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await reviewMediaRepository.createUnattachedPhoto({
    userId,
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmUpload(userId: string, mediaId: string) {
  const media = await reviewMediaRepository.findPhotoById(mediaId);
  if (!media || media.userId !== userId || media.mediaType !== "REVIEW_PHOTO") {
    throw new NotFoundError("Media not found");
  }
  if (media.status !== "PENDING") {
    return media; // already confirmed — idempotent from the caller's point of view
  }

  const exists = await objectExists(media.originalObjectKey);
  if (!exists) {
    throw new ValidationError("Upload not found in storage yet — has the browser upload completed?");
  }

  await reviewMediaRepository.markProcessing(mediaId);
  await enqueueMediaProcessing(mediaId);
  return reviewMediaRepository.findPhotoById(mediaId);
}

/** Called from review.service.ts's createReview — attaches already-uploaded, owned, unattached photos to the new review. */
export function attachPhotosToReview(mediaIds: string[], reviewId: string, userId: string) {
  if (mediaIds.length === 0) {
    return Promise.resolve();
  }
  if (mediaIds.length > MAX_PHOTOS_PER_REVIEW) {
    throw new ValidationError(`A review can have at most ${MAX_PHOTOS_PER_REVIEW} photos`);
  }
  return reviewMediaRepository.attachPhotosToReview(mediaIds, reviewId, userId);
}
