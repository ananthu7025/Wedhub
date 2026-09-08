"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { castChallengeVote } from "@/lib/api/challenges-client";
import { trackEvent } from "@/lib/analytics/track";
import { formatApiError } from "@/lib/utils/error";

/**
 * Casts one vote for a challenge entry — mirrors VendorHeartButton's
 * optimistic-update shape. Server is always the source of truth for the
 * final count (never trust a client-incremented number beyond the optimistic
 * flash), so a failed vote rolls the displayed count back.
 */
export function ChallengeVoteButton({
  challengeSlug,
  entryId,
  initialVoteCount,
  initialHasVoted,
  isAuthenticated,
  votingOpen,
  className,
}: {
  challengeSlug: string;
  entryId: string;
  initialVoteCount: number;
  initialHasVoted: boolean;
  isAuthenticated: boolean;
  votingOpen: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!votingOpen) {
    return (
      <button type="button" disabled className={cn("rounded-full bg-surface-input px-4 py-2 text-xs font-bold text-text-grey", className)}>
        Voting Closed
      </button>
    );
  }

  async function handleClick() {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (pending || hasVoted) return;

    setPending(true);
    setError(null);
    setHasVoted(true);
    setVoteCount((count) => count + 1);

    try {
      const result = await castChallengeVote(challengeSlug, entryId);
      if (!result.success) {
        setHasVoted(false);
        setVoteCount((count) => count - 1);
        setError(formatApiError(result.error));
        return;
      }
      setVoteCount(result.data.voteCount);
      trackEvent({ eventType: "challenge_vote", metadata: { challengeSlug, entryId } });
    } catch {
      setHasVoted(false);
      setVoteCount((count) => count - 1);
      setError("Could not submit your vote. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || hasVoted}
        aria-pressed={hasVoted}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors disabled:cursor-default",
          hasVoted ? "bg-crimson-10 text-crimson-70" : "bg-brand-primary text-white hover:opacity-90",
          className,
        )}
      >
        <span aria-hidden>{hasVoted ? "❤️" : "🤍"}</span>
        {hasVoted ? "Voted" : "Vote"} · {voteCount.toLocaleString("en-IN")}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-70">{error}</p>}
    </div>
  );
}
