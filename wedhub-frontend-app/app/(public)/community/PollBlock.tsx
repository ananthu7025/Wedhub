"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { castCommunityPollVote } from "@/lib/api/community-client";
import type { CommunityPollOption } from "@/lib/api/community.types";

/**
 * Shared poll-rendering block for both the feed list and post detail —
 * single-choice, changeable voting with live result bars. Optimistic on
 * click (mirrors CommunityFeedList.tsx's VoteButton), reconciled against
 * the real response.
 */
export function PollBlock({
  postId,
  options: initialOptions,
  myOptionId: initialMyOptionId,
  isAuthenticated,
}: {
  postId: string;
  options: CommunityPollOption[];
  myOptionId: string | undefined;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [options, setOptions] = useState(initialOptions);
  const [myOptionId, setMyOptionId] = useState(initialMyOptionId);
  const [pending, setPending] = useState(false);

  const total = options.reduce((sum, o) => sum + o.voteCount, 0);

  async function handleVote(optionId: string) {
    if (!isAuthenticated) {
      router.push("/login?next=/community");
      return;
    }
    if (pending || optionId === myOptionId) return;
    const previousOptions = options;
    const previousMyOptionId = myOptionId;

    // Optimistic recompute: move one vote off the old option (if any) onto the new one.
    setOptions((prev) =>
      prev.map((o) => {
        if (o.id === optionId) return { ...o, voteCount: o.voteCount + 1 };
        if (o.id === previousMyOptionId) return { ...o, voteCount: Math.max(0, o.voteCount - 1) };
        return o;
      }),
    );
    setMyOptionId(optionId);
    setPending(true);

    const result = await castCommunityPollVote(postId, optionId);
    setPending(false);
    if (result.success) {
      setOptions((prev) =>
        prev.map((o) => {
          const updated = result.data.options.find((r) => r.id === o.id);
          return updated ? { ...o, voteCount: updated.voteCount } : o;
        }),
      );
      setMyOptionId(result.data.optionId);
    } else {
      setOptions(previousOptions);
      setMyOptionId(previousMyOptionId);
    }
  }

  return (
    <div className="mb-2 flex flex-col gap-2">
      {options.map((option) => {
        const percent = total > 0 ? Math.round((option.voteCount / total) * 100) : 0;
        const selected = option.id === myOptionId;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleVote(option.id)}
            disabled={isAuthenticated && pending}
            title={isAuthenticated ? undefined : "Log in to vote"}
            className={`relative overflow-hidden rounded-md border px-3 py-2 text-left text-[13px] font-semibold disabled:cursor-not-allowed ${
              selected ? "border-brand-primary" : "border-border"
            }`}
          >
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 ${selected ? "bg-brand-primary-soft" : "bg-surface-input"}`}
              style={{ width: `${percent}%` }}
            />
            <span className="relative flex items-center justify-between gap-2">
              <span className="text-text-dark">{option.label}</span>
              <span className="text-text-grey">{percent}%</span>
            </span>
          </button>
        );
      })}
      <p className="text-[11px] text-text-grey">
        {total} vote{total === 1 ? "" : "s"}
      </p>
    </div>
  );
}
