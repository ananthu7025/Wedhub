"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { createCommunityComment, reportCommunityPost, toggleCommunityVote } from "@/lib/api/community-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";
import type { CommunityComment, CommunityPost } from "@/lib/api/community.types";

function displayAuthorName(author: CommunityComment["author"]): string {
  const name = [author.profile?.firstName, author.profile?.lastName].filter(Boolean).join(" ");
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

function CommentComposer({
  postId,
  parentId,
  isAuthenticated,
  onPosted,
  onCancel,
  autoFocus,
}: {
  postId: string;
  parentId?: string;
  isAuthenticated: boolean;
  onPosted: (comment: CommunityComment) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthenticated) {
    return <p className="text-[13px] text-text-grey">Log in to join the conversation.</p>;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError("");
    const result = await createCommunityComment(postId, { body: body.trim(), parentId });
    setSubmitting(false);
    if (result.success) {
      setBody("");
      onPosted(result.data);
      onCancel?.();
    } else {
      setError(formatApiError(result.error));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "Add a comment…"}
        maxLength={2000}
        autoFocus={autoFocus}
        className="min-h-[70px] w-full rounded-md border border-border px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-red">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-md bg-brand-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Posting…" : parentId ? "Reply" : "Comment"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-border bg-white px-4 py-2 text-xs font-bold text-text-dark">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function CommentRow({
  comment,
  postId,
  isAuthenticated,
  onReplyPosted,
}: {
  comment: CommunityComment;
  postId: string;
  isAuthenticated: boolean;
  onReplyPosted: (parentId: string, reply: CommunityComment) => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="border-b border-neutral-grey-20 py-3 last:border-b-0">
      <div className="mb-1 flex items-center gap-2 text-xs text-text-grey">
        <strong className="text-text-dark">{displayAuthorName(comment.author)}</strong>
        <span>{formatRelativeTime(comment.createdAt)}</span>
      </div>
      <p className="mb-1.5 text-[13px] text-text-body">{comment.body}</p>
      {!replying && (
        <button type="button" onClick={() => setReplying(true)} className="text-xs font-bold text-text-grey hover:text-text-dark">
          Reply
        </button>
      )}
      {replying && (
        <div className="mt-2">
          <CommentComposer
            postId={postId}
            parentId={comment.id}
            isAuthenticated={isAuthenticated}
            autoFocus
            onCancel={() => setReplying(false)}
            onPosted={(reply) => onReplyPosted(comment.id, reply)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-neutral-grey-20 pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id}>
              <div className="mb-1 flex items-center gap-2 text-xs text-text-grey">
                <strong className="text-text-dark">{displayAuthorName(reply.author)}</strong>
                <span>{formatRelativeTime(reply.createdAt)}</span>
              </div>
              <p className="text-[13px] text-text-body">{reply.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PostDetail({
  post,
  initialComments,
  isAuthenticated,
}: {
  post: CommunityPost;
  initialComments: CommunityComment[];
  isAuthenticated: boolean;
}) {
  const [vote, setVote] = useState({ voted: Boolean(post.votes?.length), voteCount: post.voteCount });
  const [comments, setComments] = useState(initialComments);
  const [reportState, setReportState] = useState<"idle" | "open" | "sent">("idle");
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");

  async function handleVote() {
    if (!isAuthenticated) return;
    const previous = vote;
    setVote({ voted: !previous.voted, voteCount: previous.voteCount + (previous.voted ? -1 : 1) });
    const result = await toggleCommunityVote(post.id);
    if (result.success) {
      setVote({ voted: result.data.voted, voteCount: result.data.voteCount });
    } else {
      setVote(previous);
    }
  }

  async function handleReport(event: React.FormEvent) {
    event.preventDefault();
    if (!reportReason.trim()) return;
    const result = await reportCommunityPost(post.id, { reason: reportReason.trim() });
    if (result.success) {
      setReportState("sent");
    } else {
      setReportError(formatApiError(result.error));
    }
  }

  const photo = post.media[0];
  const photoKey = photo?.optimizedObjectKey ?? photo?.originalObjectKey;

  return (
    <div>
      <div className="rounded-xl border border-border bg-white p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-text-grey">
          {post.tag && <Badge variant="crimson">{post.tag.name}</Badge>}
          <span>
            {displayAuthorName(post.author)} · {formatRelativeTime(post.createdAt)}
          </span>
        </div>
        <h1 className="mb-2 text-xl font-bold">{post.title}</h1>
        <p className="mb-3 whitespace-pre-wrap text-sm text-text-body">{post.body}</p>
        {photoKey && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={getPublicMediaUrl(photoKey)} alt="" className="mb-3 max-h-[420px] w-full rounded-md object-cover" />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleVote}
            disabled={!isAuthenticated}
            aria-pressed={vote.voted}
            className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold disabled:cursor-not-allowed ${
              vote.voted ? "border-brand-primary bg-brand-primary-soft text-brand-primary" : "border-border bg-white text-text-grey hover:bg-surface-input"
            }`}
          >
            <span aria-hidden>▲</span> {vote.voteCount}
          </button>
          {isAuthenticated && reportState === "idle" && (
            <button type="button" onClick={() => setReportState("open")} className="text-xs font-bold text-text-grey hover:text-text-dark">
              Report
            </button>
          )}
          {reportState === "sent" && <span className="text-xs text-text-grey">Reported — thank you</span>}
        </div>

        {reportState === "open" && (
          <form onSubmit={handleReport} className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-surface-input p-3">
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Why are you reporting this post?"
              maxLength={500}
              className="min-h-[60px] w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            {reportError && <p className="text-xs text-red">{reportError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="rounded-md bg-red px-4 py-2 text-xs font-bold text-white">
                Submit report
              </button>
              <button type="button" onClick={() => setReportState("idle")} className="rounded-md border border-border bg-white px-4 py-2 text-xs font-bold text-text-dark">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-white p-5">
        <h2 className="mb-3 text-base font-bold">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </h2>
        <div className="mb-4">
          <CommentComposer
            postId={post.id}
            isAuthenticated={isAuthenticated}
            onPosted={(comment) => setComments((prev) => [...prev, { ...comment, replies: [] }])}
          />
        </div>
        <div className="flex flex-col">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              postId={post.id}
              isAuthenticated={isAuthenticated}
              onReplyPosted={(parentId, reply) =>
                setComments((prev) =>
                  prev.map((c) => (c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c)),
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
