import type { CommunityPostStatus } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import * as communityPostRepository from "./community-post.repository";
import * as communityTagRepository from "./community-tag.repository";
import * as communityReportRepository from "./community-report.repository";
import { communityMediaService } from "../community-media";
import { getOrCreateCommunityUsername } from "./community-username.util";

// A HIDDEN post is never returned to a normal reader — only FLAGGED/VISIBLE
// are publicly listed, mirroring Review's status gating (public reads only
// ever see APPROVED). FLAGGED stays visible (same reasoning as
// review.service.ts::reportReview: a report surfaces a post into the admin
// queue immediately without hiding it from other readers on a single
// unverified report).
const PUBLIC_STATUSES: CommunityPostStatus[] = ["VISIBLE", "FLAGGED"];

export async function listFeed(filter: {
  tagId: string | undefined;
  sort: "hot" | "new";
  page: number;
  limit: number;
  viewerUserId: string | undefined;
}) {
  const [posts, total] = await Promise.all([
    communityPostRepository.listFeed({ ...filter, statuses: PUBLIC_STATUSES }),
    communityPostRepository.countFeed({ statuses: PUBLIC_STATUSES, tagId: filter.tagId }),
  ]);
  return { posts, total };
}

export async function getPost(id: string, viewerUserId: string | undefined) {
  const post = await communityPostRepository.findPostById(id, viewerUserId);
  if (!post || post.status === "HIDDEN") {
    throw new NotFoundError("Post not found");
  }
  return post;
}

export async function createPost(
  authorUserId: string,
  input: {
    tagId: string | undefined;
    title: string;
    body: string | undefined;
    mediaId: string | undefined;
    pollOptions: string[] | undefined;
  },
) {
  if (input.tagId) {
    const tag = await communityTagRepository.findTagById(input.tagId);
    if (!tag) {
      throw new ValidationError("Selected tag does not exist");
    }
  }

  // Assigns the poster's anonymous handle on their first-ever community
  // write (idempotent past that point) — done before creating the post so
  // the very first response already carries a real handle, not a
  // still-null communityUsername the frontend would need to special-case.
  await getOrCreateCommunityUsername(authorUserId);

  const post = await communityPostRepository.createPost({
    authorUserId,
    tagId: input.tagId,
    title: input.title,
    body: input.body,
    pollOptions: input.pollOptions,
  });

  if (input.mediaId) {
    await communityMediaService.attachPhotoToPost(input.mediaId, post.id, authorUserId);
  }

  return post;
}

export async function reportPost(reporterId: string, postId: string, reason: string) {
  const post = await communityPostRepository.findPostById(postId, undefined);
  if (!post || post.status === "HIDDEN") {
    throw new NotFoundError("Post not found");
  }

  const existing = await communityReportRepository.findExistingReport(postId, reporterId);
  if (existing) {
    throw new ConflictError("You have already reported this post");
  }

  const report = await communityReportRepository.createReport(postId, reporterId, reason);

  // Same posture as review.service.ts::reportReview: surface into the admin
  // queue immediately on the first report rather than waiting for a
  // threshold — false positives are cheap for an admin to reverse, but an
  // abusive post sitting unflagged is the worse failure mode.
  if (post.status === "VISIBLE") {
    await communityPostRepository.setPostStatus(postId, "FLAGGED");
  }

  return report;
}

export function listFlaggedAdmin(page: number, limit: number) {
  return Promise.all([
    communityPostRepository.listFlaggedAdmin(page, limit),
    communityPostRepository.countFlaggedAdmin(),
  ]);
}

export async function moderatePost(postId: string, status: "VISIBLE" | "HIDDEN") {
  const post = await communityPostRepository.findPostById(postId, undefined);
  if (!post) {
    throw new NotFoundError("Post not found");
  }
  return communityPostRepository.setPostStatus(postId, status);
}
