import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getVendorReviews } from "@/lib/api/catalog";
import { ReviewsBoard } from "./ReviewsBoard";

export const metadata: Metadata = {
  title: "Reviews",
};

export default async function VendorReviewsPage() {
  const vendor = await requireVendorOwnership();
  // GET /vendors/:vendorId/reviews is the same public, APPROVED-only
  // endpoint the couple-facing profile page uses (see
  // lib/api/reviews.types.ts) — there is no vendor-scoped "all statuses"
  // review list on the backend.
  const { data: reviews } = await getVendorReviews(vendor.id, 1, 50);

  return (
    <VendorShell activeHref="/vendor/reviews" vendorName={vendor.businessName}>
      <ReviewsBoard
        initialReviews={reviews}
        vendorName={vendor.businessName}
        averageRating={vendor.averageRating}
        reviewCount={vendor.reviewCount}
      />
    </VendorShell>
  );
}
