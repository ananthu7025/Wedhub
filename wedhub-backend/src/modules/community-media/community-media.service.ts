import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { NotFoundError, ValidationError } from "../../common/errors";
import { getSignedUploadUrl, objectExists } from "../../integrations/storage/r2.client";
import { enqueueMediaProcessing } from "../../jobs/queues/media-processing.queue";
import * as communityMediaRepository from "./community-media.repository";
import { MAX_PHOTOS_PER_POST } from "./community-media.schema";

function extensionFor(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

/**
 * Couples-only community post photos — same shape as review-media.service.ts
 * (a small, unmoderated-at-upload-time, no-entitlement-check parallel to the
 * vendor media pipeline): userId-owned, not vendor-owned, reusing the same
 * R2 client and media-processing queue/worker (both keyed generically by
 * mediaId).
 */
export async function createUploadRequest(
  userId: string,
  input: { filename: string; mimeType: string; fileSize: number },
) {
  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const existingCount = await communityMediaRepository.countMyUnattachedPendingPhotos(userId);
  if (existingCount >= MAX_PHOTOS_PER_POST) {
    throw new ValidationError(`You can attach up to ${MAX_PHOTOS_PER_POST} photo per post`);
  }

  const objectKey = `community-photos/${userId}/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await communityMediaRepository.createUnattachedPhoto({
    userId,
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmUpload(userId: string, mediaId: string) {
  const media = await communityMediaRepository.findPhotoById(mediaId);
  if (!media || media.userId !== userId || media.mediaType !== "COMMUNITY_POST_PHOTO") {
    throw new NotFoundError("Media not found");
  }
  if (media.status !== "PENDING") {
    return media; // already confirmed — idempotent from the caller's point of view
  }

  const exists = await objectExists(media.originalObjectKey);
  if (!exists) {
    throw new ValidationError("Upload not found in storage yet — has the browser upload completed?");
  }

  await communityMediaRepository.markProcessing(mediaId);
  await enqueueMediaProcessing(mediaId);
  return communityMediaRepository.findPhotoById(mediaId);
}

/** Called from community-post.service.ts's createPost — attaches an already-uploaded, owned, unattached photo to the new post. */
export function attachPhotoToPost(mediaId: string, postId: string, userId: string) {
  return communityMediaRepository.attachPhotoToPost(mediaId, postId, userId);
}
