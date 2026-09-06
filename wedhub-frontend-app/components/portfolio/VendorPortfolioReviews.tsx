"use client";

import Image from "next/image";
import type { VendorReview } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { StarIcon, CheckIcon } from "./icons";

interface VendorPortfolioReviewsProps {
  reviews: VendorReview[];
  averageRating: number | string;
  reviewCount: number;
  businessName: string;
}

export function VendorPortfolioReviews({
  reviews,
  averageRating,
  reviewCount,
  businessName,
}: VendorPortfolioReviewsProps) {
  const numericRating = Number(averageRating);
  const hasReviews = reviews.length > 0 || reviewCount > 0;

  return (
    <div className="space-y-6">
      {/* Overall rating banner if reviews exist */}
      {hasReviews && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-2xl font-black text-white shadow-xs">
              {numericRating > 0 ? numericRating.toFixed(1) : "—"}
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} className="h-4 w-4" filled={star <= Math.round(numericRating)} />
                ))}
              </div>
              <p className="mt-1 text-xs sm:text-sm font-medium text-neutral-600">
                Based on {reviewCount} client review{reviewCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="text-xs text-neutral-500">
            Real feedback from verified couples & clients
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white py-14 text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-3">
            <StarIcon className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">No client reviews yet</h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm">
            Reviews from couples and clients will appear here once submitted and published.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          {reviews.map((review) => (
            <div key={review.id} className="p-6 transition-colors hover:bg-neutral-50/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon key={star} className="h-3.5 w-3.5" filled={star <= review.rating} />
                      ))}
                    </div>
                    {review.verifiedInteraction && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                        <CheckIcon className="h-3 w-3" /> Verified Event
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="mt-2 text-sm sm:text-base font-bold text-neutral-900">
                      {review.title}
                    </h4>
                  )}
                </div>

                {review.createdAt && (
                  <span className="text-[11px] text-neutral-400 whitespace-nowrap">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>

              {review.content && (
                <p className="mt-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {review.content}
                </p>
              )}

              {/* Review photos */}
              {review.photos && review.photos.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {review.photos.map((photo) => {
                    const key =
                      photo.thumbnailObjectKey ??
                      photo.optimizedObjectKey ??
                      photo.originalObjectKey;
                    return (
                      <div
                        key={photo.id}
                        className="relative h-18 w-18 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
                      >
                        <Image
                          src={getPublicMediaUrl(key)}
                          alt="Review photo"
                          fill
                          className="object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Vendor response */}
              {review.vendorResponse && (
                <div className="mt-4 rounded-xl border border-neutral-200/70 bg-neutral-50/80 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-800">
                      Response from {businessName}
                    </span>
                    {review.vendorRespondedAt && (
                      <span className="text-[10px] text-neutral-400">
                        {new Date(review.vendorRespondedAt).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {review.vendorResponse}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
