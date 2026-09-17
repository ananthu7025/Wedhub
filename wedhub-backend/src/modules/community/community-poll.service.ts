import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { getOrCreateCommunityUsername } from "./community-username.util";

// Same Serializable-transaction + retry-once-on-serialization-failure shape
// as community-vote.service.ts::toggleVote / challenge-vote.service.ts —
// see either for the full rationale. The one behavioral difference: a poll
// vote is single-choice-and-changeable rather than toggleable, so casting a
// new vote when one already exists MOVES it (decrement the old option,
// increment the new one) instead of removing it outright.
const SERIALIZATION_FAILURE_PRISMA_CODE = "P2034";

export interface CastPollVoteResult {
  optionId: string;
  options: { id: string; label: string; voteCount: number }[];
}

export async function castPollVote(postId: string, optionId: string, userId: string): Promise<CastPollVoteResult> {
  await getOrCreateCommunityUsername(userId);
  try {
    return await runCastVoteTransaction(postId, optionId, userId);
  } catch (err) {
    if (isSerializationFailure(err)) {
      try {
        return await runCastVoteTransaction(postId, optionId, userId);
      } catch (retryErr) {
        if (isSerializationFailure(retryErr)) {
          throw new ConflictError("Please try voting again");
        }
        throw retryErr;
      }
    }
    throw err;
  }
}

async function runCastVoteTransaction(postId: string, optionId: string, userId: string): Promise<CastPollVoteResult> {
  return prisma.$transaction(
    async (tx) => {
      const post = await tx.communityPost.findUnique({ where: { id: postId }, select: { id: true, status: true, postType: true } });
      if (!post || post.status === "HIDDEN") {
        throw new NotFoundError("Post not found");
      }
      if (post.postType !== "POLL") {
        throw new ValidationError("This post is not a poll");
      }

      const option = await tx.communityPollOption.findUnique({ where: { id: optionId } });
      if (!option || option.postId !== postId) {
        throw new ValidationError("This option does not belong to the poll");
      }

      const existing = await tx.communityPollVote.findUnique({ where: { postId_userId: { postId, userId } } });

      if (existing && existing.optionId === optionId) {
        // Already voted for this exact option — a no-op re-click, not an error.
      } else if (existing) {
        await tx.communityPollVote.update({ where: { id: existing.id }, data: { optionId } });
        await tx.communityPollOption.update({ where: { id: existing.optionId }, data: { voteCount: { decrement: 1 } } });
        await tx.communityPollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
      } else {
        await tx.communityPollVote.create({ data: { postId, optionId, userId } });
        await tx.communityPollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
      }

      const options = await tx.communityPollOption.findMany({ where: { postId }, orderBy: { sortOrder: "asc" } });
      return { optionId, options: options.map((o) => ({ id: o.id, label: o.label, voteCount: o.voteCount })) };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function isSerializationFailure(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === SERIALIZATION_FAILURE_PRISMA_CODE;
}
