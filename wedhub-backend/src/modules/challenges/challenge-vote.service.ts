import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { ConflictError, NotFoundError } from "../../common/errors";
import { omitUndefined } from "../../common/utils/object.util";
import { assertChallengeOpenForVoting } from "./challenge-entry.policy";
import * as challengeService from "./challenge.service";

// Prisma's own error code for "transaction failed due to a write conflict or
// deadlock" under a non-default isolation level — this is how a Postgres
// Serializable-transaction abort (SQLSTATE 40001) surfaces through Prisma,
// not as a raw Postgres code in `meta`.
const SERIALIZATION_FAILURE_PRISMA_CODE = "P2034";

export interface CastVoteInput {
  challengeSlug: string;
  entryId: string;
  userId: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

export async function castVote(input: CastVoteInput) {
  const challenge = await challengeService.getBySlug(input.challengeSlug);

  try {
    return await runVoteTransaction(challenge.id, input);
  } catch (err) {
    if (isSerializationFailure(err)) {
      // Two truly-simultaneous requests from the same user raced past the
      // PER_CHALLENGE check before either committed — retry once under a
      // fresh transaction rather than surfacing a raw 500. If it still
      // fails, treat it as a real conflict rather than looping forever.
      try {
        return await runVoteTransaction(challenge.id, input);
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

async function runVoteTransaction(challengeId: string, input: CastVoteInput) {
  return prisma.$transaction(
    async (tx) => {
      const challenge = await tx.challenge.findUniqueOrThrow({ where: { id: challengeId } });
      assertChallengeOpenForVoting(challenge);

      const entry = await tx.challengeEntry.findUnique({ where: { id: input.entryId } });
      if (!entry || entry.challengeId !== challengeId || entry.status !== "APPROVED") {
        throw new NotFoundError("This entry is not eligible to receive votes");
      }

      if (challenge.voteScope === "PER_CHALLENGE") {
        const existing = await tx.challengeVote.findFirst({ where: { userId: input.userId, challengeId } });
        if (existing) {
          throw new ConflictError("You have already voted in this challenge");
        }
      }

      const vote = await tx.challengeVote.create({
        data: {
          challengeId,
          entryId: input.entryId,
          userId: input.userId,
          ...omitUndefined({ ipAddress: input.ipAddress, userAgent: input.userAgent }),
        },
      });

      const updatedEntry = await tx.challengeEntry.update({
        where: { id: input.entryId },
        data: { voteCount: { increment: 1 } },
      });

      return { vote, voteCount: updatedEntry.voteCount };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function isSerializationFailure(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === SERIALIZATION_FAILURE_PRISMA_CODE;
}

function mapVoteError(err: unknown): unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return new ConflictError("You have already voted for this entry");
  }
  return err;
}
