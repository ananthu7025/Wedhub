import { prisma } from "../../config/database";

// Batches the "hasVotedByMe" lookup for a page of entries in one query
// rather than N — backs the entries/rankings listing endpoints' per-entry
// vote badge.
export function findMyVoteEntryIds(userId: string, entryIds: string[]) {
  return prisma.challengeVote.findMany({
    where: { userId, entryId: { in: entryIds } },
    select: { entryId: true },
  });
}

export function findMyVoteInChallenge(userId: string, challengeId: string) {
  return prisma.challengeVote.findFirst({ where: { userId, challengeId } });
}
