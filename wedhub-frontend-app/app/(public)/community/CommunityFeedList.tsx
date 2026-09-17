"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { listCommunityFeedClient, toggleCommunityVote } from "@/lib/api/community-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import type { CommunityPost } from "@/lib/api/community.types";
import { PollBlock } from "./PollBlock";
import { CommentIcon, HeartIcon } from "./icons";

const PAGE_LIMIT = 20;

// Reddit-style anonymous handle — never the poster's real name (the
// backend never sends one). Falls back to "A couple" only for the
// theoretical case of a still-null handle (shouldn't occur post-generation).
function displayAuthorName(post: CommunityPost): string {
  return post.author.profile?.communityUsername ?? "A couple";
}

function initialsFromUsername(name: string): string {
  return name.slice(0, 2).toUpperCase();
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
  const router = useRouter();
  const [state, setState] = useState({ voted, voteCount });
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!isAuthenticated) {
      router.push("/login?next=/community");
      return;
    }
    if (pending) return;
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
      disabled={pending}
      aria-pressed={state.voted}
      title={isAuthenticated ? "Like" : "Log in to like"}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
        state.voted
          ? "border-brand-primary bg-brand-primary-soft text-brand-primary"
          : "border-border bg-white text-text-grey hover:bg-surface-input"
      }`}
    >
      <HeartIcon className="h-3.5 w-3.5" filled={state.voted} />
      <span>{state.voteCount}</span>
    </button>
  );
}

// Mockup shows a photo grid: up to 3 tiles shown, a 4th tile overlaid with
// "+N" when there are more than 4 photos total. Community posts currently
// cap at one photo (MAX_PHOTOS_PER_POST in community-media.schema.ts), so
// this renders correctly for today's single-photo posts and is already
// shaped to grow if that cap is ever raised.
function PhotoGrid({ photoKeys }: { photoKeys: string[] }) {
  if (photoKeys.length === 0) return null;
  const visible = photoKeys.slice(0, 4);
  const remaining = photoKeys.length - visible.length;

  return (
    <div className="mb-2 grid grid-cols-4 gap-1.5">
      {visible.map((key, index) => {
        const isLast = index === visible.length - 1 && remaining > 0;
        return (
          <div key={key} className="relative aspect-square overflow-hidden rounded-md bg-surface-input">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getPublicMediaUrl(key)} alt="" className="h-full w-full object-cover" />
            {isLast && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
                +{remaining}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CommunityFeedList({
  initialPosts,
  initialTotal,
  sort,
  tagId,
  isAuthenticated,
}: {
  initialPosts: CommunityPost[];
  initialTotal: number;
  sort: "hot" | "new";
  tagId: string | undefined;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextPage = Math.floor(posts.length / PAGE_LIMIT) + 1;
    const result = await listCommunityFeedClient({ sort, tagId, page: nextPage, limit: PAGE_LIMIT });
    setLoadingMore(false);
    if (result.success) {
      setPosts((prev) => [...prev, ...result.data]);
      setTotal(result.meta?.total ?? total);
    }
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
        <h3 className="mb-1.5 text-[15px] font-bold">No posts here yet</h3>
        <p className="mb-4 max-w-[320px] text-[13px] text-text-grey">Be the first to start a conversation.</p>
        <button
          type="button"
          onClick={() => router.push(isAuthenticated ? "/community/new" : "/login?next=/community/new")}
          className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white"
        >
          New post
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => {
        const authorName = displayAuthorName(post);
        const photoKeys = post.media
          .map((m) => m.thumbnailObjectKey ?? m.optimizedObjectKey ?? m.originalObjectKey)
          .filter((key): key is string => Boolean(key));

        return (
          <div key={post.id} className="rounded-xl border border-border bg-white p-4.5">
            <div className="mb-2.5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-xs font-bold text-brand-primary">
                {initialsFromUsername(authorName)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-text-dark">{authorName}</div>
                <div className="text-xs text-text-grey">{formatRelativeTime(post.createdAt)}</div>
              </div>
            </div>

            <Link href={`/community/${post.id}`} className="no-underline">
              <h3 className="mb-1 text-[15px] font-bold text-text-dark">{post.title}</h3>
            </Link>

            {post.postType === "POLL" ? (
              <PollBlock
                postId={post.id}
                options={post.pollOptions}
                myOptionId={post.pollVotes?.[0]?.optionId}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <>
                {post.body && <p className="mb-2 line-clamp-2 text-[13px] text-text-grey">{post.body}</p>}
                <PhotoGrid photoKeys={photoKeys} />
              </>
            )}

            {post.tag && (
              <div className="mb-2">
                <Badge variant="crimson">#{post.tag.name.replace(/\s+/g, "")}</Badge>
              </div>
            )}

            <div className="flex items-center gap-3 border-t border-neutral-grey-20 pt-2.5">
              <Link
                href={`/community/${post.id}`}
                className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-grey no-underline hover:bg-surface-input"
              >
                <CommentIcon className="h-3.5 w-3.5" /> {post.commentCount}
              </Link>
              <VoteButton
                postId={post.id}
                voted={Boolean(post.votes?.length)}
                voteCount={post.voteCount}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        );
      })}

      {posts.length < total && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mx-auto rounded-full border border-border bg-white px-5 py-2.5 text-[13px] font-bold text-text-body hover:bg-surface-input disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
