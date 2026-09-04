"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { getPublicMediaUrl } from "@/lib/media/url";
import { respondToMyReview } from "@/lib/api/reviews-client";
import type { VendorReview } from "@/lib/api/vendors.types";
import { formatApiError } from "@/lib/utils/error";

/**
 * Reviews list + rating summary + respond action (Frontend Arch Phase 6),
 * matching wedhub-frontend/vendor/reviews.html. The star-count histogram is
 * computed client-side from the fetched (already APPROVED-only) review
 * list — the backend has no per-star breakdown endpoint (see
 * lib/api/reviews.types.ts). "Based on N reviews" uses the real
 * Vendor.reviewCount rather than the fetched page length, since the page is
 * capped at 50 and a vendor could have more.
 */

type Tab = "ALL" | 5 | 4 | "LOW" | "AWAITING";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function ReviewsBoard({
  initialReviews,
  vendorName,
  averageRating,
  reviewCount,
}: {
  initialReviews: VendorReview[];
  vendorName: string;
  averageRating: string;
  reviewCount: number;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [tab, setTab] = useState<Tab>("ALL");
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const histogram = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(1, ...histogram.map((h) => h.count));

  const visibleReviews = reviews.filter((r) => {
    if (tab === "ALL") return true;
    if (tab === 5) return r.rating === 5;
    if (tab === 4) return r.rating === 4;
    if (tab === "LOW") return r.rating <= 3;
    if (tab === "AWAITING") return !r.vendorResponse;
    return true;
  });

  const awaitingCount = reviews.filter((r) => !r.vendorResponse).length;

  async function handleReply(reviewId: string) {
    const text = replyDrafts[reviewId]?.trim();
    if (!text) return;
    setSaving(reviewId);
    setError(null);
    const result = await respondToMyReview(reviewId, { vendorResponse: text });
    setSaving(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, ...result.data } : r)));
    setOpenReplyId(null);
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-text-grey">See what couples are saying about {vendorName}</p>
      </div>

      <div className="mb-5 rounded-xl border border-border bg-white p-6">
        <div className="flex flex-col items-start gap-5 max-[700px]:flex-col sm:flex-row sm:items-center">
          <div className="text-[44px] font-bold">{Number(averageRating).toFixed(1)}</div>
          <div className="flex-1">
            {histogram.map(({ star, count }) => (
              <div key={star} className="mb-1 flex items-center gap-2 text-xs">
                <span className="w-6">{star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-surface-input">
                  <div className="h-full bg-[#f0a202]" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="text-text-grey">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-text-grey">
          Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}
        </p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["ALL", `All (${reviews.length})`],
            [5, "5★"],
            [4, "4★"],
            ["LOW", "3★ & below"],
            ["AWAITING", `Awaiting response (${awaitingCount})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={String(value)}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-[13px] font-bold ${
              tab === value ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="mb-1.5 text-[15px] font-bold">No reviews here</h3>
          <p className="max-w-[320px] text-[13px] text-text-grey">Nothing matches this filter yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white p-6">
          {visibleReviews.map((review) => (
            <div key={review.id} className="border-b border-neutral-grey-20 py-4.5 first:pt-0 last:border-b-0 last:pb-0">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ink-soft text-xs font-bold text-white">
                  {review.verifiedInteraction ? "✓" : "?"}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                    {review.verifiedInteraction && <Badge variant="green">✓ Verified booking</Badge>}
                  </div>
                  <div className="text-xs text-text-grey">
                    {formatDate(review.eventDate)} · Reviewed {formatRelativeTime(review.createdAt)}
                  </div>
                </div>
              </div>

              <div className="text-[#f0a202]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
              {review.title && <div className="mt-1 text-sm font-bold">{review.title}</div>}
              {review.content && <p className="mt-2 text-[13px] leading-relaxed">{review.content}</p>}

              {review.photos.length > 0 && (
                <div className="mt-2.5 flex gap-2">
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

              {review.vendorResponse ? (
                <div className="mt-2.5 rounded-md bg-surface-input p-3.5 text-[13px]">
                  <strong className="mb-1 block text-xs">Response from {vendorName}</strong>
                  {review.vendorResponse}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setOpenReplyId(openReplyId === review.id ? null : review.id)}
                    className="mt-2.5 rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-text-dark hover:bg-surface-input"
                  >
                    Respond
                  </button>
                  {openReplyId === review.id && (
                    <div className="mt-3">
                      <textarea
                        value={replyDrafts[review.id] ?? ""}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                        placeholder="Write a reply to this review…"
                        maxLength={2000}
                        className="min-h-[70px] w-full rounded-md border border-border p-3 text-[13px]"
                      />
                      <button
                        onClick={() => handleReply(review.id)}
                        disabled={saving === review.id || !replyDrafts[review.id]?.trim()}
                        className="mt-2.5 rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                      >
                        Post reply
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
