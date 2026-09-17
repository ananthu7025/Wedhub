"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { getPublicMediaUrl } from "@/lib/media/url";
import { moderateAdminCommunityPost } from "@/lib/api/admin-client";
import type { AdminCommunityPost } from "@/lib/api/community.types";
import { formatApiError } from "@/lib/utils/error";

/**
 * Flagged community posts moderation queue — only VISIBLE-turned-FLAGGED
 * posts ever reach this list (see community-post.service.ts::reportPost);
 * VISIBLE and HIDDEN posts don't need a queue, they're either unremarkable
 * or already dealt with. Mirrors AdminReviewsBoard.tsx's structure.
 */
// Admins see the same anonymous handle as everyone else — moderation
// decisions are made on content, not identity, and the backend's
// AUTHOR_SELECT never sends a real name/email for a community response.
function authorName(author: AdminCommunityPost["author"]): string {
  return author.profile?.communityUsername ?? "Unknown poster";
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function AdminCommunityBoard({ initialPosts, total }: { initialPosts: AdminCommunityPost[]; total: number }) {
  const [posts, setPosts] = useState(initialPosts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleModerate(id: string, status: "VISIBLE" | "HIDDEN") {
    setPendingId(id);
    setError(null);
    const result = await moderateAdminCommunityPost(id, { status });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    // Both actions are a real decision, so the post leaves this flagged-only
    // queue either way rather than flipping its badge in place.
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-sm text-text-grey">Flagged posts queue — posts land here after a couple reports them ({total} total).</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="text-[15px] font-bold">Nothing flagged</h3>
          <p className="mt-1.5 text-[13px] text-text-grey">Reported posts will show up here for review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => {
            const photo = post.media[0];
            const photoKey = photo?.thumbnailObjectKey ?? photo?.optimizedObjectKey ?? photo?.originalObjectKey;
            const latestReport = post.reports[post.reports.length - 1];
            return (
              <div key={post.id} className="rounded-xl border border-border bg-white p-5">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ink-soft text-xs font-bold text-white">
                      {authorName(post.author).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                        {authorName(post.author)}
                        {post.tag && <Badge variant="crimson">{post.tag.name}</Badge>}
                      </div>
                      <div className="text-xs text-text-grey">posted {formatRelativeTime(post.createdAt)}</div>
                    </div>
                  </div>
                  <Badge variant="red">FLAGGED</Badge>
                </div>

                <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                  {post.title}
                  {post.postType === "POLL" && <Badge variant="blue">POLL</Badge>}
                </div>
                {post.body && <p className="mb-2 text-[13px] leading-relaxed">{post.body}</p>}

                {post.postType === "POLL" && (
                  <ul className="mb-2 list-disc pl-5 text-[13px] text-text-grey">
                    {post.pollOptions.map((option) => (
                      <li key={option.id}>
                        {option.label} — {option.voteCount} vote{option.voteCount === 1 ? "" : "s"}
                      </li>
                    ))}
                  </ul>
                )}

                {photoKey && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getPublicMediaUrl(photoKey)} alt="" className="mb-3 h-24 w-24 rounded-md object-cover" />
                )}

                {post.reports.length > 0 && (
                  <div className="mb-3 rounded-md bg-red-10 p-3.5 text-[13px]">
                    <strong className="mb-1.5 block text-xs text-red-70">
                      Reported ({post.reports.length}) — most recent by {authorName(latestReport.reporter)}
                    </strong>
                    {latestReport.reason}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleModerate(post.id, "VISIBLE")}
                    disabled={pendingId === post.id}
                    className="rounded-md bg-brand-primary px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    Approve (dismiss report)
                  </button>
                  <button
                    onClick={() => handleModerate(post.id, "HIDDEN")}
                    disabled={pendingId === post.id}
                    className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-red disabled:opacity-60"
                  >
                    Hide
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
