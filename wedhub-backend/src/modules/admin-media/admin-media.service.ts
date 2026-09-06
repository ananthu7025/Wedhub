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

/**
 * Same presign/confirm pair as createUploadRequest/confirmUpload above, for
 * a PopularSearchCard's image instead of a Category's — kept as its own
 * pair (not a shared parameter) so the object-key prefix and mediaType tag
 * stay distinct per curated content type, same reasoning as the vendor
 * upload pair below being separate from these.
 */
export async function createPopularSearchImageUploadRequest(input: { filename: string; mimeType: string; fileSize: number }) {
  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const objectKey = `platform/popular-search-images/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await adminMediaRepository.createUnattachedPopularSearchImage({
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmPopularSearchImageUpload(mediaId: string) {
  const media = await adminMediaRepository.findImageById(mediaId);
  if (!media || media.mediaType !== "POPULAR_SEARCH_IMAGE") {
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

/**
 * Same presign/confirm pair as createUploadRequest/confirmUpload above, for
 * a BlogPost's cover image instead of a Category's — kept as its own pair
 * (not a shared parameter) so the object-key prefix and mediaType tag stay
 * distinct per curated content type, same reasoning as the popular-search
 * and vendor upload pairs above being separate from these.
 */
export async function createBlogCoverImageUploadRequest(input: { filename: string; mimeType: string; fileSize: number }) {
  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const objectKey = `platform/blog-cover-images/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await adminMediaRepository.createUnattachedBlogCoverImage({
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmBlogCoverImageUpload(mediaId: string) {
  const media = await adminMediaRepository.findImageById(mediaId);
  if (!media || media.mediaType !== "BLOG_COVER_IMAGE") {
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

/**
 * Same presign/confirm pair as createUploadRequest/confirmUpload above, for
 * a standalone Gallery Inspiration photo with no owning vendor — the
 * vendor-optional counterpart to createVendorUploadRequest/
 * confirmVendorUpload below. Tagged with its own GalleryCategory by the
 * caller (featured-media module), not here — this module only produces the
 * Media row itself.
 */
export async function createInspirationUploadRequest(input: { filename: string; mimeType: string; fileSize: number }) {
  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const objectKey = `platform/inspiration-images/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await adminMediaRepository.createUnattachedInspirationImage({
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmInspirationUpload(mediaId: string) {
  const media = await adminMediaRepository.findImageById(mediaId);
  if (!media || media.mediaType !== "INSPIRATION_PHOTO") {
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

/**
 * Admin uploading a real PORTFOLIO photo directly to a vendor's profile —
 * the cold-start path for Wedding Stories / Gallery Inspiration curation
 * (Arch Phase 17) when no vendor has uploaded their own approved photos
 * yet. Deliberately skips entitlementService.canVendorUpload: an admin
 * seeding a brand-new vendor's initial content shouldn't be blocked by
 * that vendor's own plan/usage state, but the resulting row is a normal
 * PORTFOLIO Media that counts toward the vendor's limit for any future
 * upload (by the vendor or another admin action) — confirmed with the
 * user. moderationStatus is set to APPROVED immediately (see
 * admin-media.repository.ts's createVendorMedia) since admin-sourced
 * content doesn't need an admin to moderate itself.
 */
export async function createVendorUploadRequest(input: {
  vendorId: string;
  albumId?: string | undefined;
  filename: string;
  mimeType: string;
  fileSize: number;
}) {
  const vendor = await adminMediaRepository.findVendorForUpload(input.vendorId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }

  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const objectKey = `vendors/${input.vendorId}/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await adminMediaRepository.createVendorMedia({
    vendorId: input.vendorId,
    albumId: input.albumId,
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmVendorUpload(mediaId: string) {
  const media = await adminMediaRepository.findImageById(mediaId);
  if (!media || media.mediaType !== "PORTFOLIO" || !media.vendorId) {
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
