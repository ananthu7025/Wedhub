import Link from "next/link";
import type { VendorReview } from "@/lib/api/vendors.types";

interface ReviewsSummaryProps {
  reviews: VendorReview[];
  reviewCount?: number;
  averageRating?: string | number;
}

export function ReviewsSummary({ reviews, reviewCount = 0, averageRating = 0 }: ReviewsSummaryProps) {
  const totalCount = Math.max(reviews.length, Number(reviewCount) || 0);
  const ratingNum = Number(averageRating) || (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) : 0);

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber/10 text-amber font-bold text-xs">
            ★
          </span>
          <h2 className="text-sm sm:text-base font-bold text-text-dark">
            Reviews
          </h2>
        </div>
        <Link
          href="/vendor/reviews"
          className="group flex items-center gap-1 text-xs font-bold text-text-grey transition-colors hover:text-brand-primary"
        >
          <span>{totalCount > 0 ? "View all reviews" : "Reviews page"}</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      <div className="mt-3.5">
        {totalCount === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface-page p-3.5 sm:p-4">
            <div>
              <p className="text-xs font-bold text-text-dark">No reviews yet</p>
              <p className="text-xs text-text-grey mt-0.5">
                Collect reviews from past couples to build trust and increase conversion.
              </p>
            </div>
            <Link
              href="/vendor/reviews"
              className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-text-dark shadow-xs transition-colors hover:bg-surface-input shrink-0"
            >
              <span>Request Review</span>
              <span className="text-text-grey">↗</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface-page p-3.5 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-text-dark">
                  {ratingNum > 0 ? ratingNum.toFixed(1) : "5.0"}
                </span>
                <span className="text-amber text-base font-bold">★</span>
              </div>
              <div className="border-l border-border pl-3">
                <p className="text-xs font-bold text-text-dark">
                  {totalCount} verified {totalCount === 1 ? "review" : "reviews"}
                </p>
                <p className="text-[11px] text-text-grey">Couples loved working with you</p>
              </div>
            </div>

            <Link
              href="/vendor/reviews"
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-white border border-border px-3.5 py-1.5 text-xs font-bold text-text-dark shadow-xs transition-colors hover:bg-surface-input shrink-0"
            >
              <span>View Reviews</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
