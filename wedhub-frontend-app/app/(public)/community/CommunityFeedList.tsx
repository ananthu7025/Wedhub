"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { toggleCommunityVote } from "@/lib/api/community-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import type { CommunityPost } from "@/lib/api/community.types";

function displayAuthorName(post: CommunityPost): string {
  const name = [post.author.profile?.firstName, post.author.profile?.lastName].filter(Boolean).join(" ");
  return name || "A couple";
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function VoteButton({
  postId,
  voted,
  voteCount,
  isAuthenticated,
}: {
  postId: string;
  voted: boolean;
  voteCount: number;
  isAuthenticated: boolean;
}) {
  const [state, setState] = useState({ voted, voteCount });
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!isAuthenticated || pending) return;
    // Optimistic update — reconciled against the real response, so a vote
    // click feels instant rather than waiting on a round trip (this is the
    // "speed" priority applied to the interaction itself, not just the read).
    const previous = state;
    const next = { voted: !previous.voted, voteCount: previous.voteCount + (previous.voted ? -1 : 1) };
    setState(next);
    setPending(true);
    const result = await toggleCommunityVote(postId);
    setPending(false);
    if (result.success) {
      setState({ voted: result.data.voted, voteCount: result.data.voteCount });
    } else {
      setState(previous);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isAuthenticated || pending}
      aria-pressed={state.voted}
      title={isAuthenticated ? "Upvote" : "Log in to upvote"}
      className={`flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
        state.voted
          ? "border-brand-primary bg-brand-primary-soft text-brand-primary"
          : "border-border bg-white text-text-grey hover:bg-surface-input"
      }`}
    >
      <span aria-hidden>▲</span>
      <span>{state.voteCount}</span>
    </button>
  );
}

export function CommunityFeedList({
  initialPosts,
  isAuthenticated,
}: {
  initialPosts: CommunityPost[];
  isAuthenticated: boolean;
}) {
  if (initialPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
        <h3 className="mb-1.5 text-[15px] font-bold">No posts here yet</h3>
        <p className="mb-4 max-w-[320px] text-[13px] text-text-grey">Be the first to start a conversation.</p>
        {isAuthenticated && (
          <Link href="/community/new" className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white no-underline">
            New post
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {initialPosts.map((post) => {
        const photo = post.media[0];
        const photoKey = photo?.thumbnailObjectKey ?? photo?.optimizedObjectKey ?? photo?.originalObjectKey;
        return (
          <div key={post.id} className="flex gap-3.5 rounded-xl border border-border bg-white p-4.5">
            <VoteButton
              postId={post.id}
              voted={Boolean(post.votes?.length)}
              voteCount={post.voteCount}
              isAuthenticated={isAuthenticated}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-text-grey">
                {post.tag && <Badge variant="crimson">{post.tag.name}</Badge>}
                <span>
                  {displayAuthorName(post)} · {formatRelativeTime(post.createdAt)}
                </span>
              </div>
              <Link href={`/community/${post.id}`} className="no-underline">
                <h3 className="mb-1 text-[15px] font-bold text-text-dark">{post.title}</h3>
              </Link>
              <p className="mb-2 line-clamp-2 text-[13px] text-text-grey">{post.body}</p>
              {photoKey && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getPublicMediaUrl(photoKey)} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
              )}
              <Link href={`/community/${post.id}`} className="text-xs font-bold text-text-grey no-underline hover:text-text-dark">
                💬 {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
