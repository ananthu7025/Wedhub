import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { toPageParams } from "../../common/utils/pagination.util";

export const ENTRY_INCLUDE = {
  vendor: { select: { id: true, slug: true, businessName: true } },
  category: { select: { id: true, name: true, slug: true } },
  image: { select: { id: true, optimizedObjectKey: true, thumbnailObjectKey: true, originalObjectKey: true } },
  additionalImages: {
    include: { media: { select: { id: true, optimizedObjectKey: true, originalObjectKey: true } } },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ChallengeEntryInclude;

// Public visibility gate — same shape as featured-media's featuredWhere():
// only APPROVED entries are ever shown to a non-admin caller.
function approvedWhere(challengeId: string): Prisma.ChallengeEntryWhereInput {
  return { challengeId, status: "APPROVED" };
}

export function findApproved(challengeId: string, filter: { page: number; limit: number; sort: "votes" | "recent" }) {
  return prisma.challengeEntry.findMany({
    where: approvedWhere(challengeId),
    include: ENTRY_INCLUDE,
    orderBy: filter.sort === "votes" ? { voteCount: "desc" } : { submittedAt: "desc" },
    ...toPageParams(filter.page, filter.limit),
  });
}

export function countApproved(challengeId: string) {
  return prisma.challengeEntry.count({ where: approvedWhere(challengeId) });
}

export function findApprovedRankedByVotes(challengeId: string, filter: { page: number; limit: number }) {
  return prisma.challengeEntry.findMany({
    where: approvedWhere(challengeId),
    include: ENTRY_INCLUDE,
    orderBy: [{ voteCount: "desc" }, { submittedAt: "asc" }],
    ...toPageParams(filter.page, filter.limit),
  });
}

export function findById(id: string) {
  return prisma.challengeEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
}

// Public single-entry lookup — still requires APPROVED, since a PENDING/
// REJECTED entry's direct URL must not be publicly viewable or votable.
export function findApprovedById(challengeId: string, id: string) {
  return prisma.challengeEntry.findFirst({
    where: { id, challengeId, status: "APPROVED" },
    include: ENTRY_INCLUDE,
  });
}

export function findMineForChallenge(challengeId: string, vendorId: string) {
  return prisma.challengeEntry.findFirst({ where: { challengeId, vendorId }, include: ENTRY_INCLUDE });
}

export function countForChallenge(challengeId: string, statuses: string[]) {
  return prisma.challengeEntry.count({ where: { challengeId, status: { in: statuses as never } } });
}

export function findByIdsForChallenge(entryIds: string[], challengeId: string) {
  return prisma.challengeEntry.findMany({
    where: { id: { in: entryIds }, challengeId },
    include: ENTRY_INCLUDE,
  });
}

export function listForAdmin(filter: {
  challengeId?: string | undefined;
  status?: string | undefined;
  page: number;
  limit: number;
}) {
  const where: Prisma.ChallengeEntryWhereInput = {};
  if (filter.challengeId) {
    where.challengeId = filter.challengeId;
  }
  if (filter.status) {
    where.status = filter.status as never;
  }
  return prisma.challengeEntry.findMany({
    where,
    include: ENTRY_INCLUDE,
    orderBy: { submittedAt: "desc" },
    ...toPageParams(filter.page, filter.limit),
  });
}

export function countForAdmin(filter: { challengeId?: string | undefined; status?: string | undefined }) {
  const where: Prisma.ChallengeEntryWhereInput = {};
  if (filter.challengeId) {
    where.challengeId = filter.challengeId;
  }
  if (filter.status) {
    where.status = filter.status as never;
  }
  return prisma.challengeEntry.count({ where });
}

// Self-healing recalculation — called from the disqualify flow, the one
// path that removes vote-contribution outside the normal insert-only vote
// flow. Mirrors vendor.service.ts's recalculateCompleteness / review's
// recalculateVendorRating "recompute from source of truth" precedent.
export async function recalculateEntryVoteCount(entryId: string): Promise<number> {
  const count = await prisma.challengeVote.count({ where: { entryId } });
  await prisma.challengeEntry.update({ where: { id: entryId }, data: { voteCount: count } });
  return count;
}

export function listParticipants(challengeId: string) {
  return prisma.challengeEntry.findMany({
    where: { challengeId },
    include: {
      vendor: { select: { id: true, slug: true, businessName: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
}
