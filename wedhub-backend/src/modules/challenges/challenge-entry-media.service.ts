import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { NotFoundError, ValidationError } from "../../common/errors";
import { getSignedUploadUrl, objectExists } from "../../integrations/storage/r2.client";
import { enqueueMediaProcessing } from "../../jobs/queues/media-processing.queue";
import * as challengeEntryMediaRepository from "./challenge-entry-media.repository";

const MAX_PHOTOS_PER_ENTRY = 6; // 1 cover + up to 5 additional (challenge.schema.ts's MAX_ADDITIONAL_ENTRY_PHOTOS)

function extensionFor(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

// Exact review-media presign/confirm shape, reused for challenge entry
// photos — a submitting end-user may have no Vendor yet at upload time
// (vendorId is only ever set once the entry itself is created), so this
// deliberately does not route through the vendor media module's
// getOwnedVendorOrThrow-gated pipeline.
export async function createUploadRequest(
  userId: string,
  input: { filename: string; mimeType: string; fileSize: number },
) {
  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const existingCount = await challengeEntryMediaRepository.countMyUnattachedPendingPhotos(userId);
  if (existingCount >= MAX_PHOTOS_PER_ENTRY) {
    throw new ValidationError(`You can upload up to ${MAX_PHOTOS_PER_ENTRY} photos per entry`);
  }

  const objectKey = `challenge-entry-photos/${userId}/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await challengeEntryMediaRepository.createUnattachedPhoto({
    userId,
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmUpload(userId: string, mediaId: string) {
  const media = await challengeEntryMediaRepository.findPhotoById(mediaId);
  if (!media || media.userId !== userId || media.mediaType !== "CHALLENGE_ENTRY_PHOTO") {
    throw new NotFoundError("Media not found");
  }
  if (media.status !== "PENDING") {
    return media; // already confirmed — idempotent from the caller's point of view
  }

  const exists = await objectExists(media.originalObjectKey);
  if (!exists) {
    throw new ValidationError("Upload not found in storage yet — has the browser upload completed?");
  }

  await challengeEntryMediaRepository.markProcessing(mediaId);
  await enqueueMediaProcessing(mediaId);
  return challengeEntryMediaRepository.findPhotoById(mediaId);
}
