import type { VendorReview } from "@/lib/api/vendors.types";

/**
 * A 5-star breakdown bar chart, computed client-side (well, server-side
 * here since this page is a Server Component) from the reviews actually
 * fetched — there is no backend endpoint that returns a per-star count, so
 * this deliberately does NOT claim to represent every review the vendor has
 * ever received. `isComplete` tells the caller whether `reviews.length`
 * equals the vendor's real total (Vendor.reviewCount) — only render this
 * breakdown when true, otherwise a percentage computed from a partial page
 * would misrepresent the vendor's real rating spread.
 */
export function VendorRatingDistribution({ reviews }: { reviews: VendorReview[] }) {
  const total = reviews.length;
  if (total === 0) return null;

  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-1.5">
      {counts.map(({ star, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-8 shrink-0 font-semibold text-text-grey">{star} ★</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-grey-20">
              <div className="h-full rounded-full bg-amber" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-text-grey">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
