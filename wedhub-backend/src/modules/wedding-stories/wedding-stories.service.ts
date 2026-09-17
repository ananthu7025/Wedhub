import { NotFoundError, ValidationError } from "../../common/errors";
import * as weddingStoriesRepository from "./wedding-stories.repository";
import type {
  CreateWeddingStoryBody,
  SubmitWeddingStoryBody,
  UpdateWeddingStoryBody,
  UpdateWeddingStoryStatusBody,
} from "./wedding-stories.schema";

// Backs the public homepage's "Real Wedding Stories" section — real,
// admin-curated stories over real vendor albums instead of a hardcoded
// frontend array.
export function listFeaturedStories() {
  return weddingStoriesRepository.findFeaturedStories();
}

export async function listPublicStories(params: weddingStoriesRepository.FindPublicStoriesParams) {
  const [result, filterOptions] = await Promise.all([
    weddingStoriesRepository.findPublicStories(params),
    weddingStoriesRepository.findDistinctFilterOptions(),
  ]);

  return {
    ...result,
    filterOptions,
  };
}

export async function getPublicStoryById(id: string) {
  const story = await weddingStoriesRepository.findPublicStoryById(id);
  if (!story) {
    throw new NotFoundError("Wedding story not found");
  }
  return story;
}

export function listAllStoriesForAdmin() {
  return weddingStoriesRepository.findAllStoriesAdmin();
}

export async function createStory(input: CreateWeddingStoryBody) {
  const album = await weddingStoriesRepository.findAlbumForStory(input.albumId);
  if (!album) {
    throw new ValidationError("albumId does not reference an existing album");
  }
  if (album.visibility !== "PUBLIC") {
    throw new ValidationError("Wedding stories can only reference a PUBLIC album");
  }
  if (!album.coverMediaId) {
    throw new ValidationError("This album has no cover image set — set one before featuring it as a wedding story");
  }

  return weddingStoriesRepository.createStory({
    albumId: input.albumId,
    coupleName: input.coupleName,
    location: input.location,
    tag: input.tag,
    snippet: input.snippet,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
  });
}

export async function updateStory(id: string, input: UpdateWeddingStoryBody) {
  const existing = await weddingStoriesRepository.findStoryById(id);
  if (!existing) {
    throw new NotFoundError("Wedding story not found");
  }

  return weddingStoriesRepository.updateStory(id, {
    coupleName: input.coupleName,
    location: input.location,
    tag: input.tag,
    snippet: input.snippet,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
  });
}

export async function deleteStory(id: string): Promise<void> {
  const existing = await weddingStoriesRepository.findStoryById(id);
  if (!existing) {
    throw new NotFoundError("Wedding story not found");
  }
  await weddingStoriesRepository.deleteStory(id);
}

// Item 10/11 — vendor-facing submission. A vendor submits a story about
// one of their own already-public albums (must have a cover, same
// requirement as the admin path in createStory above) and can optionally
// tag other vendors as collaborators (e.g. the venue, the decorator) —
// each tagged vendor must independently confirm (see confirmCollaboration
// below) before they're treated as credited. Lands in PENDING for admin
// review, unlike the admin-authored path which is immediately live.
export async function submitStoryForVendor(vendorId: string, input: SubmitWeddingStoryBody) {
  const album = await weddingStoriesRepository.findOwnAlbumForStory(vendorId, input.albumId);
  if (!album) {
    throw new ValidationError("albumId does not reference one of your own albums");
  }
  if (album.visibility !== "PUBLIC") {
    throw new ValidationError("Wedding stories can only reference a PUBLIC album");
  }
  if (!album.coverMediaId) {
    throw new ValidationError("This album has no cover image set — set one before submitting it as a wedding story");
  }

  const collaboratorVendorIds = Array.from(new Set(input.collaboratorVendorIds ?? [])).filter((id) => id !== vendorId);
  if (collaboratorVendorIds.length > 0) {
    const found = await weddingStoriesRepository.findVendorsByIds(collaboratorVendorIds);
    if (found.length !== collaboratorVendorIds.length) {
      throw new ValidationError("One or more collaborating vendors could not be found");
    }
  }

  return weddingStoriesRepository.createStoryForVendor({
    vendorId,
    albumId: input.albumId,
    coupleName: input.coupleName,
    location: input.location,
    tag: input.tag,
    snippet: input.snippet,
    collaboratorVendorIds,
  });
}

export function listOwnSubmittedStories(vendorId: string) {
  return weddingStoriesRepository.findOwnSubmittedStories(vendorId);
}

export function listStoriesAwaitingMyConfirmation(vendorId: string) {
  return weddingStoriesRepository.findStoriesAwaitingMyConfirmation(vendorId);
}

// A tagged vendor confirming or declining their credit on someone else's
// submitted story — the only two valid transitions out of PENDING.
// Confirming/declining an already-decided row, or one this vendor was
// never tagged on, is rejected rather than silently no-op'd.
export async function respondToCollaboration(
  vendorId: string,
  weddingStoryId: string,
  decision: "CONFIRMED" | "DECLINED",
) {
  const row = await weddingStoriesRepository.findCollaboratorRow(weddingStoryId, vendorId);
  if (!row) {
    throw new NotFoundError("You were not tagged as a collaborator on this story");
  }
  if (row.status !== "PENDING") {
    throw new ValidationError(`This invitation was already ${row.status.toLowerCase()}`);
  }
  return weddingStoriesRepository.updateCollaboratorStatus(weddingStoryId, vendorId, decision);
}

// Admin moderation queue for vendor-submitted stories.
export function listPendingStoriesForAdmin() {
  return weddingStoriesRepository.findPendingStoriesAdmin();
}

export async function updateStoryStatus(id: string, input: UpdateWeddingStoryStatusBody) {
  const existing = await weddingStoriesRepository.findStoryById(id);
  if (!existing) {
    throw new NotFoundError("Wedding story not found");
  }
  if (existing.status !== "PENDING") {
    throw new ValidationError(`This story was already ${existing.status.toLowerCase()}`);
  }
  if (input.status === "REJECTED" && !input.rejectionReason) {
    throw new ValidationError("A reason is required when rejecting a story");
  }
  return weddingStoriesRepository.updateStoryStatus(id, input.status, input.rejectionReason);
}
