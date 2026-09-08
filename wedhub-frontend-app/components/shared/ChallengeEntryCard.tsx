"use client";

import Image from "next/image";
import Link from "next/link";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ChallengeVoteButton } from "./ChallengeVoteButton";
import type { ChallengeEntry } from "@/lib/api/challenges.types";

/**
 * The card shown in a challenge's entry grid and (in a more compact form) on
 * the rankings page — mobile-first since most traffic arrives from
 * Instagram/Reels/WhatsApp shares of a single entry link.
 */
export function ChallengeEntryCard({
  challengeSlug,
  entry,
  hasVotedByMe,
  isAuthenticated,
  votingOpen,
  rank,
}: {
  challengeSlug: string;
  entry: ChallengeEntry;
  hasVotedByMe: boolean;
  isAuthenticated: boolean;
  votingOpen: boolean;
  rank?: number;
}) {
  const imageKey = entry.image.optimizedObjectKey ?? entry.image.originalObjectKey;
  const entryUrl = `/challenges/${challengeSlug}/entry/${entry.id}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-card)]">
      <Link href={entryUrl} className="relative block aspect-[4/5] w-full bg-surface-input">
        <Image src={getPublicMediaUrl(imageKey)} alt={entry.title} fill className="object-cover" />
        {rank !== undefined && rank <= 3 && (
          <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold shadow-md">
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </span>
        )}
      </Link>
      <div className="p-3.5">
        <p className="truncate text-sm font-bold text-text-dark">Mehndi by {entry.vendor.businessName}</p>
        {entry.location && <p className="text-xs text-text-grey">{entry.location}</p>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <ChallengeVoteButton
            challengeSlug={challengeSlug}
            entryId={entry.id}
            initialVoteCount={entry.voteCount}
            initialHasVoted={hasVotedByMe}
            isAuthenticated={isAuthenticated}
            votingOpen={votingOpen}
          />
          <Link
            href={`/vendors/${entry.vendor.slug}`}
            className="shrink-0 rounded-full border border-border px-3 py-2 text-xs font-bold text-text-body no-underline hover:bg-surface-input"
          >
            View Artist
          </Link>
        </div>
      </div>
    </div>
  );
}
