import type { Challenge } from "@prisma/client";
import * as challengeEntryRepository from "./challenge-entry.repository";

export interface RankingsResult {
  frozen: boolean;
  entries: Awaited<ReturnType<typeof challengeEntryRepository.findApprovedRankedByVotes>>;
  total: number;
}

// Rankings are hidden from non-admin callers only during the final
// hideLiveRankingsBeforeEndHours hours of the VOTING phase — admins always
// see live data, so they can preview the exact public leaderboard page
// while it's frozen rather than needing a second, differently-shaped
// admin-only endpoint.
export function isRankingsFrozen(challenge: Challenge, now: Date): boolean {
  if (challenge.hideLiveRankingsBeforeEndHours == null) {
    return false;
  }
  if (challenge.status !== "VOTING") {
    return false;
  }
  const freezeStartsAt = new Date(
    challenge.votingEndDate.getTime() - challenge.hideLiveRankingsBeforeEndHours * 3_600_000,
  );
  return now >= freezeStartsAt && now <= challenge.votingEndDate;
}

export async function getRankings(
  challenge: Challenge,
  filter: { page: number; limit: number },
  callerIsAdmin: boolean,
): Promise<RankingsResult> {
  const frozen = !callerIsAdmin && isRankingsFrozen(challenge, new Date());
  if (frozen) {
    return { frozen: true, entries: [], total: 0 };
  }

  const [entries, total] = await Promise.all([
    challengeEntryRepository.findApprovedRankedByVotes(challenge.id, filter),
    challengeEntryRepository.countApproved(challenge.id),
  ]);
  return { frozen: false, entries, total };
}
