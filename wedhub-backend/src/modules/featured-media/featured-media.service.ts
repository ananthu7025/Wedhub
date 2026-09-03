import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import * as featuredMediaRepository from "./featured-media.repository";
import type { CreateFeaturedMediaBody, UpdateFeaturedMediaBody } from "./featured-media.schema";

// Backs the public homepage's "Gallery Inspiration" section — real,
// admin-curated selections of real vendor portfolio media instead of a
// hardcoded frontend array.
export function listFeatured() {
  return featuredMediaRepository.findFeatured();
}

export function listAllForAdmin() {
  return featuredMediaRepository.findAllForAdmin();
}

export async function createFeaturedMedia(input: CreateFeaturedMediaBody) {
  const media = await featuredMediaRepository.findMediaForFeaturing(input.mediaId);
  if (!media) {
    throw new ValidationError("mediaId does not reference an existing media item");
  }
  if (media.status !== "READY" || media.moderationStatus !== "APPROVED") {
    throw new ValidationError("Only fully-processed, moderator-approved media can be featured");
  }

  try {
    return await featuredMediaRepository.createFeaturedMedia({
      mediaId: input.mediaId,
      titleOverride: input.titleOverride,
      sortOrder: input.sortOrder,
    });
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new ConflictError("This media item is already featured");
    }
    throw err;
  }
}

export async function updateFeaturedMedia(id: string, input: UpdateFeaturedMediaBody) {
  const existing = await featuredMediaRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Featured media entry not found");
  }

  return featuredMediaRepository.updateFeaturedMedia(id, {
    titleOverride: input.titleOverride,
    sortOrder: input.sortOrder,
  });
}

export async function deleteFeaturedMedia(id: string): Promise<void> {
  const existing = await featuredMediaRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Featured media entry not found");
  }
  await featuredMediaRepository.deleteFeaturedMedia(id);
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}
