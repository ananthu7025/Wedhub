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
          blurDataUrl: true,
        },
      },
    },
  },
} as const;

export function findFeaturedStories() {
  return prisma.weddingStory.findMany({
    // Item 10/11: status = APPROVED added so a vendor-submitted story
    // never appears here before an admin has reviewed it — a no-op filter
    // for the pre-existing admin-authored rows, which the migration
    // backfilled to APPROVED.
    where: { isFeatured: true, status: "APPROVED", album: { visibility: "PUBLIC" } },
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
    // Item 10/11: see findFeaturedStories' comment on why this is here.
    status: "APPROVED",
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
    where: { status: "APPROVED", album: { visibility: "PUBLIC" } },
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
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
    include: OWN_STORY_INCLUDE,
  });
}

export function findStoryById(id: string) {
  return prisma.weddingStory.findUnique({ where: { id }, include: OWN_STORY_INCLUDE });
}

export function findPublicStoryById(id: string) {
  return prisma.weddingStory.findFirst({
    where: { id, status: "APPROVED", album: { visibility: "PUBLIC" } },
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
              blurDataUrl: true,
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

// Item 10/11 — vendor-facing additions below. Ownership check for
// submitStoryForVendor: a vendor may only submit a story against their own
// album, unlike the admin path (createStory above), which trusts any
// albumId since the caller is already admin-gated.
export function findOwnAlbumForStory(vendorId: string, albumId: string) {
  return prisma.album.findFirst({
    where: { id: albumId, vendorId },
    select: { id: true, vendorId: true, visibility: true, coverMediaId: true },
  });
}

export function findVendorsByIds(vendorIds: string[]) {
  return prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, businessName: true } });
}

// Submission + auto-confirmed submitter collaborator row in one
// transaction — the submitting vendor doesn't need to separately "confirm"
// their own participation (see WeddingStoryVendor's own schema comment).
export function createStoryForVendor(data: {
  vendorId: string;
  albumId: string;
  coupleName: string;
  location: string;
  tag: string;
  snippet: string;
  collaboratorVendorIds: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const story = await tx.weddingStory.create({
      data: {
        albumId: data.albumId,
        coupleName: data.coupleName,
        location: data.location,
        tag: data.tag,
        snippet: data.snippet,
        submittedByVendorId: data.vendorId,
        status: "PENDING",
      },
    });
    await tx.weddingStoryVendor.create({
      data: { weddingStoryId: story.id, vendorId: data.vendorId, status: "CONFIRMED" },
    });
    if (data.collaboratorVendorIds.length > 0) {
      await tx.weddingStoryVendor.createMany({
        data: data.collaboratorVendorIds.map((vendorId) => ({
          weddingStoryId: story.id,
          vendorId,
          status: "PENDING" as const,
        })),
      });
    }
    return tx.weddingStory.findUniqueOrThrow({
      where: { id: story.id },
      include: { ...PUBLIC_STORY_INCLUDE, collaborators: { include: { vendor: { select: { id: true, businessName: true, slug: true } } } } },
    });
  });
}

const OWN_STORY_INCLUDE = {
  ...PUBLIC_STORY_INCLUDE,
  collaborators: { include: { vendor: { select: { id: true, businessName: true, slug: true } } } },
} as const;

export function findOwnSubmittedStories(vendorId: string) {
  return prisma.weddingStory.findMany({
    where: { submittedByVendorId: vendorId },
    orderBy: { createdAt: "desc" },
    include: OWN_STORY_INCLUDE,
  });
}

// Stories where this vendor was tagged as a collaborator by someone else
// (never includes stories they submitted themselves — those are covered
// by findOwnSubmittedStories, and the submitter's own row there is always
// CONFIRMED already, nothing to act on).
export function findStoriesAwaitingMyConfirmation(vendorId: string) {
  return prisma.weddingStory.findMany({
    where: { collaborators: { some: { vendorId, status: "PENDING" } } },
    orderBy: { createdAt: "desc" },
    include: OWN_STORY_INCLUDE,
  });
}

export function findCollaboratorRow(weddingStoryId: string, vendorId: string) {
  return prisma.weddingStoryVendor.findUnique({
    where: { weddingStoryId_vendorId: { weddingStoryId, vendorId } },
  });
}

export function updateCollaboratorStatus(weddingStoryId: string, vendorId: string, status: "CONFIRMED" | "DECLINED") {
  return prisma.weddingStoryVendor.update({
    where: { weddingStoryId_vendorId: { weddingStoryId, vendorId } },
    data: { status },
  });
}

// Admin moderation queue — stories a vendor submitted, still awaiting a
// decision.
export function findPendingStoriesAdmin() {
  return prisma.weddingStory.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: OWN_STORY_INCLUDE,
  });
}

export function updateStoryStatus(id: string, status: "APPROVED" | "REJECTED", rejectionReason: string | undefined) {
  return prisma.weddingStory.update({
    where: { id },
    data: { status, rejectionReason: status === "REJECTED" ? (rejectionReason ?? null) : null },
    include: PUBLIC_STORY_INCLUDE,
  });
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
