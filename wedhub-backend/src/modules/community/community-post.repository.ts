import type { CommunityPostStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { toPageParams } from "../../common/utils/pagination.util";
import { omitUndefined } from "../../common/utils/object.util";

// READY-only, same "don't surface a mid-upload photo" principle used across
// every other user-uploaded-media list in this codebase (review photos,
// portfolio media).
const POST_PHOTO_INCLUDE = {
  media: { where: { status: "READY" as const }, orderBy: { createdAt: "asc" as const }, take: 1 },
} as const;

// Never selects email/firstName/lastName — a community author is shown
// only as their anonymous communityUsername (see community-username.util.ts),
// never their real identity, in every public-facing response (feed, post
// detail, comments, admin queue).
const AUTHOR_SELECT = {
  id: true,
  profile: { select: { communityUsername: true } },
} as const;

// Options ordered by sortOrder (creation order) — vote counts are read
// straight off the denormalized column (see community-poll.service.ts),
// never aggregated from CommunityPollVote at read time.
const POST_POLL_INCLUDE = {
  pollOptions: { orderBy: { sortOrder: "asc" as const } },
} as const;

const POST_LIST_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  tag: true,
  ...POST_PHOTO_INCLUDE,
  ...POST_POLL_INCLUDE,
} as const;

export interface ListFeedFilter {
  statuses: CommunityPostStatus[];
  tagId: string | undefined;
  sort: "hot" | "new";
  page: number;
  limit: number;
  viewerUserId: string | undefined;
}

// `status IN (...)` still hits the leading column of both composite
// indexes (community_posts_status_vote_count_created_at_idx /
// community_posts_status_created_at_idx) as a multi-value equality scan —
// Postgres doesn't need a single-value equality to use a composite index's
// leading column.
function feedWhere(filter: { statuses: CommunityPostStatus[]; tagId: string | undefined }): Prisma.CommunityPostWhereInput {
  const where: Prisma.CommunityPostWhereInput = { status: { in: filter.statuses } };
  if (filter.tagId) {
    where.tagId = filter.tagId;
  }
  return where;
}

// Two dedicated composite indexes back these two sort modes
// (community_posts_status_vote_count_created_at_idx /
// community_posts_status_created_at_idx, schema.prisma) — Postgres can't
// use a single index to satisfy both an ORDER BY voteCount and an ORDER BY
// createdAt efficiently, so "hot" and "new" each get their own.
export function listFeed(filter: ListFeedFilter) {
  const where = feedWhere(filter);
  const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
    filter.sort === "hot" ? [{ voteCount: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  return prisma.communityPost.findMany({
    where,
    include: {
      ...POST_LIST_INCLUDE,
      // Only ever selects the viewer's own vote row (at most one, unique
      // [postId, userId]) — lets the API tell the frontend "you upvoted
      // this" without a separate per-post round trip. Same shape for the
      // viewer's own poll vote (also at most one row, unique [postId, userId]).
      ...(filter.viewerUserId
        ? {
            votes: { where: { userId: filter.viewerUserId }, select: { id: true } },
            pollVotes: { where: { userId: filter.viewerUserId }, select: { optionId: true } },
          }
        : {}),
    },
    orderBy,
    ...toPageParams(filter.page, filter.limit),
  });
}

export function countFeed(filter: { statuses: CommunityPostStatus[]; tagId: string | undefined }) {
  return prisma.communityPost.count({ where: feedWhere(filter) });
}

export function findPostById(id: string, viewerUserId: string | undefined) {
  return prisma.communityPost.findUnique({
    where: { id },
    include: {
      ...POST_LIST_INCLUDE,
      ...(viewerUserId
        ? {
            votes: { where: { userId: viewerUserId }, select: { id: true } },
            pollVotes: { where: { userId: viewerUserId }, select: { optionId: true } },
          }
        : {}),
    },
  });
}

export function createPost(data: {
  authorUserId: string;
  tagId: string | undefined;
  title: string;
  body: string | undefined;
  pollOptions: string[] | undefined;
}) {
  return prisma.communityPost.create({
    data: {
      authorUserId: data.authorUserId,
      title: data.title,
      postType: data.pollOptions ? "POLL" : "TEXT",
      ...omitUndefined({ tagId: data.tagId, body: data.body }),
      ...(data.pollOptions
        ? {
            pollOptions: {
              create: data.pollOptions.map((label, index) => ({ label, sortOrder: index })),
            },
          }
        : {}),
    },
    include: POST_LIST_INCLUDE,
  });
}

export function setPostStatus(id: string, status: CommunityPostStatus) {
  return prisma.communityPost.update({ where: { id }, data: { status } });
}

export function listFlaggedAdmin(page: number, limit: number) {
  return prisma.communityPost.findMany({
    where: { status: "FLAGGED" },
    include: {
      ...POST_LIST_INCLUDE,
      reports: { include: { reporter: { select: AUTHOR_SELECT } } },
    },
    orderBy: { createdAt: "desc" },
    ...toPageParams(page, limit),
  });
}

export function countFlaggedAdmin() {
  return prisma.communityPost.count({ where: { status: "FLAGGED" } });
}
