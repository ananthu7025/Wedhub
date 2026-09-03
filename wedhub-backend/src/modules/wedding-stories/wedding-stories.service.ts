import { NotFoundError, ValidationError } from "../../common/errors";
import * as weddingStoriesRepository from "./wedding-stories.repository";
import type { CreateWeddingStoryBody, UpdateWeddingStoryBody } from "./wedding-stories.schema";

// Backs the public homepage's "Real Wedding Stories" section — real,
// admin-curated stories over real vendor albums instead of a hardcoded
// frontend array.
export function listFeaturedStories() {
  return weddingStoriesRepository.findFeaturedStories();
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
