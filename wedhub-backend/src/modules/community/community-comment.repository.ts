import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

const AUTHOR_SELECT = {
  id: true,
  email: true,
  profile: { select: { firstName: true, lastName: true } },
} as const;

export function findPostForComment(postId: string) {
  return prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true, status: true } });
}

export function findCommentById(id: string) {
  return prisma.communityComment.findUnique({ where: { id } });
}

// One flat query ordered by createdAt — the service layer groups replies
// under their parent (one level deep) rather than a recursive DB query,
// since depth is capped at 1 and this keeps the query itself trivial/fast.
export function listCommentsByPost(postId: string) {
  return prisma.communityComment.findMany({
    where: { postId },
    include: { author: { select: AUTHOR_SELECT } },
    orderBy: { createdAt: "asc" },
  });
}

// One transaction: insert the comment and bump the post's denormalized
// commentCount together, mirroring messaging.repository.ts::createMessage's
// insert+bump-parent-counter pattern exactly.
export function createComment(input: { postId: string; authorUserId: string; parentId: string | undefined; body: string }) {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.communityComment.create({
      data: {
        postId: input.postId,
        authorUserId: input.authorUserId,
        body: input.body,
        ...omitUndefined({ parentId: input.parentId }),
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
    await tx.communityPost.update({
      where: { id: input.postId },
      data: { commentCount: { increment: 1 } },
    });
    return comment;
  });
}
