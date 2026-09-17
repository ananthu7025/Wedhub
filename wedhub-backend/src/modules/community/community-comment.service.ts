import { NotFoundError, ValidationError } from "../../common/errors";
import * as communityCommentRepository from "./community-comment.repository";
import { getOrCreateCommunityUsername } from "./community-username.util";

export interface CommentWithReplies {
  id: string;
  postId: string;
  authorUserId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  author: { id: string; profile: { communityUsername: string | null } | null };
  replies: CommentWithReplies[];
}

export async function listComments(postId: string): Promise<CommentWithReplies[]> {
  const flat = await communityCommentRepository.listCommentsByPost(postId);
  const byId = new Map<string, CommentWithReplies>();
  for (const c of flat) {
    byId.set(c.id, { ...c, replies: [] });
  }

  const topLevel: CommentWithReplies[] = [];
  for (const c of flat) {
    const node = byId.get(c.id) as CommentWithReplies;
    if (c.parentId) {
      const parent = byId.get(c.parentId);
      // A reply whose parent has since been deleted still needs somewhere
      // to render — falls back to top-level rather than silently vanishing.
      if (parent) {
        parent.replies.push(node);
        continue;
      }
    }
    topLevel.push(node);
  }
  return topLevel;
}

export async function createComment(
  authorUserId: string,
  postId: string,
  input: { parentId: string | undefined; body: string },
) {
  const post = await communityCommentRepository.findPostForComment(postId);
  if (!post || post.status === "HIDDEN") {
    throw new NotFoundError("Post not found");
  }

  if (input.parentId) {
    const parent = await communityCommentRepository.findCommentById(input.parentId);
    if (!parent || parent.postId !== postId) {
      throw new ValidationError("Parent comment not found on this post");
    }
    // Enforced here, not in the schema: a reply's parent must itself be a
    // top-level comment — this is what keeps threading to exactly one
    // level deep, per the confirmed scope decision.
    if (parent.parentId) {
      throw new ValidationError("Replies can only be one level deep");
    }
  }

  await getOrCreateCommunityUsername(authorUserId);

  return communityCommentRepository.createComment({
    postId,
    authorUserId,
    parentId: input.parentId,
    body: input.body,
  });
}
