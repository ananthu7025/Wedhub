import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { ConflictError, NotFoundError } from "../../common/errors";

// Same Prisma error code used by challenge-vote.service.ts for a Postgres
// Serializable-transaction abort (SQLSTATE 40001).
const SERIALIZATION_FAILURE_PRISMA_CODE = "P2034";

export interface ToggleVoteResult {
  voted: boolean;
  voteCount: number;
}

// Upvote-only and toggleable (click again to un-vote), unlike
// challenge-vote's one-shot-per-challenge vote — so this doesn't reuse that
// service's "already voted -> reject" branch, but does reuse its exact
// concurrency shape: a Serializable transaction, retried once on a
// serialization failure, so two near-simultaneous clicks from the same user
// can't double-toggle the counter.
export async function toggleVote(postId: string, userId: string): Promise<ToggleVoteResult> {
  try {
    return await runToggleTransaction(postId, userId);
  } catch (err) {
    if (isSerializationFailure(err)) {
      try {
        return await runToggleTransaction(postId, userId);
      } catch (retryErr) {
        if (isSerializationFailure(retryErr)) {
          throw new ConflictError("Please try voting again");
        }
        throw mapVoteError(retryErr);
      }
    }
    throw mapVoteError(err);
  }
}

async function runToggleTransaction(postId: string, userId: string): Promise<ToggleVoteResult> {
  return prisma.$transaction(
    async (tx) => {
      const post = await tx.communityPost.findUnique({ where: { id: postId }, select: { id: true, status: true } });
      if (!post || post.status === "HIDDEN") {
        throw new NotFoundError("Post not found");
      }

      const existing = await tx.communityPostVote.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        await tx.communityPostVote.delete({ where: { id: existing.id } });
        const updated = await tx.communityPost.update({
          where: { id: postId },
          data: { voteCount: { decrement: 1 } },
        });
        return { voted: false, voteCount: updated.voteCount };
      }

      await tx.communityPostVote.create({ data: { postId, userId } });
      const updated = await tx.communityPost.update({
        where: { id: postId },
        data: { voteCount: { increment: 1 } },
      });
      return { voted: true, voteCount: updated.voteCount };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function isSerializationFailure(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === SERIALIZATION_FAILURE_PRISMA_CODE;
}

function mapVoteError(err: unknown): unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return new ConflictError("Please try voting again");
  }
  return err;
}
