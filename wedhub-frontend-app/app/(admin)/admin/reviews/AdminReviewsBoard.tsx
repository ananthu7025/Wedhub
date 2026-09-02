"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { getPublicMediaUrl } from "@/lib/media/url";
import { moderateAdminReview } from "@/lib/api/admin-client";
import type { AdminReviewListItem, ReviewModerationStatus } from "@/lib/api/admin.types";

/**
 * Review moderation queue (Frontend Arch Phase 9), matching
 * wedhub-frontend/admin/reviews.html reduced to real backend behavior.
 * Real gaps vs. the mockup, confirmed via research: only 4 real moderation
 * actions exist (Approve/Reject/Flag/Hide via one status PATCH) — no
 * separate "Remove" action; the mockup's "Remove"/"Remove permanently" map
 * to the real HIDDEN status (soft-hide, row persists, not a delete). No
 * "Disputed" status exists at all — omitted, not relabeled. Reviewer and
 * reporter names are now real (a small backend addition this phase,
 * joining User onto both the review and its reports — previously bare
 * UUIDs only).
 */

const STATUS_TABS: Array<{ value: ReviewModerationStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "APPROVED", label: "Approved" },
  { value: "FLAGGED", label: "Flagged" },
  { value: "HIDDEN", label: "Hidden" },
  { value: "REJECTED", label: "Rejected" },
];

function reviewerName(user: AdminReviewListItem["user"]): string {
  if (!user) return "Unknown reviewer";
  if (user.profile?.firstName) return `${user.profile.firstName} ${user.profile.lastName ?? ""}`.trim();
  return user.email;
}

function statusBadgeVariant(status: string): "green" | "amber" | "red" | "grey" {
  switch (status) {
    case "APPROVED":
      return "green";
    case "PENDING":
      return "amber";
    case "FLAGGED":
      return "red";
    default:
      return "grey";
  }
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function AdminReviewsBoard({
  initialReviews,
  total,
  activeStatus,
}: {
  initialReviews: AdminReviewListItem[];
  total: number;
  activeStatus: ReviewModerationStatus | undefined;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleModerate(id: string, status: ReviewModerationStatus) {
    setPendingId(id);
    setError(null);
    const result = await moderateAdminReview(id, { status });
    setPendingId(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: result.data.status } : r)));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-text-grey">Moderation queue — flagged reviews come from user reports.</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === "ALL" ? activeStatus === undefined : activeStatus === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/admin/reviews" : `/admin/reviews?status=${tab.value}`}
              className={`rounded-full px-4 py-2 text-[13px] font-bold no-underline ${
                isActive ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
              }`}
            >
              {tab.label} ({tab.value === "ALL" ? total : reviews.filter((r) => r.status === tab.value).length})
            </Link>
          );
        })}
      </div>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="text-[15px] font-bold">No reviews here</h3>
          <p className="mt-1.5 text-[13px] text-text-grey">Nothing matches this filter yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-white p-5">
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ink-soft text-xs font-bold text-white">
                    {reviewerName(review.user).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                      {reviewerName(review.user)}
                      {review.verifiedInteraction && <Badge variant="green">✓ Verified interaction</Badge>}
                    </div>
                    <div className="text-xs text-text-grey">
                      on {review.vendor.businessName} · submitted {formatRelativeTime(review.createdAt)}
                    </div>
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(review.status)}>{review.status}</Badge>
              </div>

              <div className="mb-1.5 text-[#f0a202]">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </div>
              {review.title && <div className="mb-1 text-sm font-bold">{review.title}</div>}
              {review.content && <p className="mb-2 text-[13px] leading-relaxed">{review.content}</p>}

              {review.photos.length > 0 && (
                <div className="mb-3 flex gap-2">
                  {review.photos.map((photo) => {
                    const key = photo.thumbnailObjectKey ?? photo.optimizedObjectKey ?? photo.originalObjectKey;
                    return (
                      <div key={photo.id} className="relative h-16 w-16 overflow-hidden rounded-md bg-surface-input">
                        <Image src={getPublicMediaUrl(key)} alt="" fill className="object-cover" />
                      </div>
                    );
                  })}
                </div>
              )}

              {review.reports.length > 0 && (
                <div className="mb-3 rounded-md bg-red-10 p-3.5 text-[13px]">
                  <strong className="mb-1.5 block text-xs text-red-70">
                    Reported ({review.reports.length}) — most recent by {reviewerName(review.reports[review.reports.length - 1].reporter)}
                  </strong>
                  {review.reports[review.reports.length - 1].reason}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {review.status !== "APPROVED" && (
                  <button
                    onClick={() => handleModerate(review.id, "APPROVED")}
                    disabled={pendingId === review.id}
                    className="rounded-md bg-brand-primary px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    {review.reports.length > 0 ? "Approve (dismiss report)" : "Approve"}
                  </button>
                )}
                {review.status !== "FLAGGED" && review.status !== "APPROVED" && (
                  <button
                    onClick={() => handleModerate(review.id, "FLAGGED")}
                    disabled={pendingId === review.id}
                    className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-text-dark disabled:opacity-60"
                  >
                    Flag
                  </button>
                )}
                {review.status !== "HIDDEN" && (
                  <button
                    onClick={() => handleModerate(review.id, "HIDDEN")}
                    disabled={pendingId === review.id}
                    className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-red disabled:opacity-60"
                  >
                    Hide
                  </button>
                )}
                {review.status === "HIDDEN" && (
                  <button
                    onClick={() => handleModerate(review.id, "REJECTED")}
                    disabled={pendingId === review.id}
                    className="rounded-md bg-red px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    Reject permanently
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
