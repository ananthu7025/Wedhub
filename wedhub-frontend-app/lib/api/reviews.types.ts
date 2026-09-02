/**
 * Vendor-facing review types for Frontend Arch Phase 6. The read side
 * intentionally reuses VendorReview/VendorReviewPhoto from vendors.types.ts
 * (GET /vendors/:vendorId/reviews) rather than duplicating them — verified
 * against wedhub-backend/src/modules/reviews during Phase 6 research that
 * this is the ONLY endpoint that lists a vendor's reviews, public or not:
 * it hard-filters status=APPROVED, so the vendor sees exactly what a couple
 * sees. There is no vendor-scoped "all statuses" endpoint and no per-star
 * histogram endpoint — Vendor.averageRating/reviewCount (on VendorSelf) are
 * the only server-computed aggregates; a star breakdown is computed
 * client-side from the fetched review list.
 */

// ---- POST /reviews/:id/respond ----
export interface RespondToReviewBody {
  vendorResponse: string;
}
