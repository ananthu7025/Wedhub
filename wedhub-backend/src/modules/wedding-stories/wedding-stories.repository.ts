import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

// Same public-visibility gate as albums.repository.ts's
// listPublicVendorAlbums — a wedding story's photo must be a real,
// published, moderator-approved image, not anything mid-upload/pending.
const PUBLIC_STORY_INCLUDE = {
  album: {
    include: {
      vendor: { select: { id: true, businessName: true, slug: true } },
      coverMedia: true,
    },
  },
} as const;

export function findFeaturedStories() {
  return prisma.weddingStory.findMany({
    where: { isFeatured: true, album: { visibility: "PUBLIC" } },
    orderBy: { sortOrder: "asc" },
    include: PUBLIC_STORY_INCLUDE,
  });
}

export function findAllStoriesAdmin() {
  return prisma.weddingStory.findMany({
    orderBy: { sortOrder: "asc" },
    include: PUBLIC_STORY_INCLUDE,
  });
}

export function findStoryById(id: string) {
  return prisma.weddingStory.findUnique({ where: { id }, include: PUBLIC_STORY_INCLUDE });
}

export function findAlbumForStory(albumId: string) {
  return prisma.album.findUnique({ where: { id: albumId }, select: { id: true, visibility: true, coverMediaId: true } });
}

export function createStory(data: {
  albumId: string;
  coupleName: string;
  location: string;
  tag: string;
  snippet: string;
  isFeatured: boolean | undefined;
  sortOrder: number | undefined;
}) {
  const fields = omitUndefined({ isFeatured: data.isFeatured, sortOrder: data.sortOrder });
  return prisma.weddingStory.create({
    data: {
      albumId: data.albumId,
      coupleName: data.coupleName,
      location: data.location,
      tag: data.tag,
      snippet: data.snippet,
      ...fields,
    },
    include: PUBLIC_STORY_INCLUDE,
  });
}

export interface WeddingStoryUpdateFields {
  coupleName: string | undefined;
  location: string | undefined;
  tag: string | undefined;
  snippet: string | undefined;
  isFeatured: boolean | undefined;
  sortOrder: number | undefined;
}

export function updateStory(id: string, data: WeddingStoryUpdateFields) {
  return prisma.weddingStory.update({ where: { id }, data: omitUndefined(data), include: PUBLIC_STORY_INCLUDE });
}

export function deleteStory(id: string) {
  return prisma.weddingStory.delete({ where: { id } });
}
