import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

// Same public-visibility gate as albums.repository.ts's
// listPublicVendorAlbums — a wedding story's photo must be a real,
// published, moderator-approved image, not anything mid-upload/pending.
const PUBLIC_STORY_INCLUDE = {
  album: {
    include: {
      vendor: { select: { id: true, businessName: true, slug: true, city: true } },
      coverMedia: true,
      media: {
        take: 3,
        select: {
          id: true,
          originalObjectKey: true,
          optimizedObjectKey: true,
          thumbnailObjectKey: true,
        },
      },
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

export interface FindPublicStoriesParams {
  page?: number | undefined;
  limit?: number | undefined;
  location?: string | undefined;
  tag?: string | undefined;
  search?: string | undefined;
  sort?: string | undefined;
}

export async function findPublicStories(params: FindPublicStoriesParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
  const skip = (page - 1) * limit;

  const where: any = {
    album: { visibility: "PUBLIC" },
  };

  if (params.location && params.location.trim() !== "") {
    where.location = { contains: params.location.trim(), mode: "insensitive" };
  }

  if (params.tag && params.tag.trim() !== "") {
    where.tag = { contains: params.tag.trim(), mode: "insensitive" };
  }

  if (params.search && params.search.trim() !== "") {
    const q = params.search.trim();
    where.OR = [
      { coupleName: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { tag: { contains: q, mode: "insensitive" } },
      { snippet: { contains: q, mode: "insensitive" } },
      { album: { vendor: { businessName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  let orderBy: any = [{ sortOrder: "asc" }, { createdAt: "desc" }];
  if (params.sort === "recent") {
    orderBy = { createdAt: "desc" };
  } else if (params.sort === "asc") {
    orderBy = { coupleName: "asc" };
  } else if (params.sort === "desc") {
    orderBy = { coupleName: "desc" };
  }

  const [total, stories] = await Promise.all([
    prisma.weddingStory.count({ where }),
    prisma.weddingStory.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: PUBLIC_STORY_INCLUDE,
    }),
  ]);

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function findDistinctFilterOptions() {
  const publicStories = await prisma.weddingStory.findMany({
    where: { album: { visibility: "PUBLIC" } },
    select: { location: true, tag: true },
  });

  const locationsSet = new Set<string>();
  const tagsSet = new Set<string>();

  for (const s of publicStories) {
    if (s.location) locationsSet.add(s.location.trim());
    if (s.tag) tagsSet.add(s.tag.trim());
  }

  return {
    locations: Array.from(locationsSet).sort(),
    tags: Array.from(tagsSet).sort(),
  };
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

export function findPublicStoryById(id: string) {
  return prisma.weddingStory.findFirst({
    where: { id, album: { visibility: "PUBLIC" } },
    include: {
      album: {
        include: {
          vendor: { select: { id: true, businessName: true, slug: true, city: true } },
          coverMedia: true,
          media: {
            select: {
              id: true,
              originalObjectKey: true,
              optimizedObjectKey: true,
              thumbnailObjectKey: true,
              width: true,
              height: true,
              altText: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
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
