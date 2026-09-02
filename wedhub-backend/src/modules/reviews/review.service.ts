import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import * as notificationService from "../notifications/notification.service";
import * as reviewRepository from "./review.repository";

async function assertVendorIsPublic(vendorId: string) {
  const vendor = await reviewRepository.findVendorStatus(vendorId);
  if (!vendor || vendor.status !== "APPROVED") {
    throw new NotFoundError("Vendor not found");
  }
  return vendor;
}

export async function createReview(
  userId: string,
  input: {
    vendorId: string;
    serviceId: string | undefined;
    rating: number;
    title: string | undefined;
    content: string | undefined;
    eventDate: Date | undefined;
  },
) {
  const vendor = await assertVendorIsPublic(input.vendorId);

  // product.md §24: "Do not allow vendors to review themselves." A vendor's
  // owning user reviewing their own vendor is blocked outright — there is no
  // scenario where that's a legitimate customer review.
  if (vendor.ownerUserId === userId) {
    throw new ValidationError("You cannot review your own vendor listing");
  }

  const existing = await reviewRepository.findExistingReview(userId, input.vendorId);
  if (existing) {
    throw new ConflictError("You have already reviewed this vendor");
  }

  // verifiedInteraction: confirmed with the user as "does this reviewer have
  // any Lead against this vendor" (any status) — the real signal Arch Phase
  // 9 makes available, rather than requiring a WON outcome specifically.
  const hasInteraction = await reviewRepository.hasAnyLeadWithVendor(userId, input.vendorId);

  const review = await reviewRepository.createReview({
    userId,
    vendorId: input.vendorId,
    serviceId: input.serviceId,
    rating: input.rating,
    title: input.title,
    content: input.content,
    eventDate: input.eventDate,
    verifiedInteraction: !!hasInteraction,
  });

  await logAnalyticsEvent({
    userId,
    eventType: "review_created",
    vendorId: input.vendorId,
    metadata: { reviewId: review.id, verifiedInteraction: !!hasInteraction },
  });

  if (vendor.ownerUserId) {
    await notificationService.notify({
      userId: vendor.ownerUserId,
      eventType: "REVIEW_RECEIVED",
      data: { rating: input.rating },
      relatedEntityType: "review",
      relatedEntityId: review.id,
    });
  }

  // Rating aggregation only counts APPROVED reviews (see recalculateVendorRating),
  // and a brand-new review starts PENDING, so no recalculation is needed here —
  // it happens when an admin approves the review, not on creation.
  return review;
}

export function listVendorReviews(vendorId: string, page: number, limit: number) {
  return Promise.all([
    reviewRepository.listVendorReviews(vendorId, page, limit),
    reviewRepository.countVendorReviews(vendorId),
  ]);
}

export async function respondToReview(vendorOwnerUserId: string, reviewId: string, vendorResponse: string) {
  const review = await reviewRepository.findReviewById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }
  const vendor = await reviewRepository.findVendorStatus(review.vendorId);
  if (!vendor || vendor.ownerUserId !== vendorOwnerUserId) {
    throw new NotFoundError("Review not found");
  }
  return reviewRepository.addVendorResponse(reviewId, vendorResponse);
}

export async function reportReview(reporterId: string, reviewId: string, reason: string) {
  const review = await reviewRepository.findReviewById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  const existing = await reviewRepository.findExistingReport(reviewId, reporterId);
  if (existing) {
    throw new ConflictError("You have already reported this review");
  }

  const report = await reviewRepository.createReport(reviewId, reporterId, reason);

  // A report surfaces the review into the admin queue immediately rather
  // than waiting for N reports — false positives are cheap (an admin can
  // approve it right back), but a genuinely abusive review sitting live
  // and unflagged is the worse failure mode.
  if (review.status === "APPROVED" || review.status === "PENDING") {
    await reviewRepository.setReviewStatus(reviewId, "FLAGGED");
    // Rating aggregation must stay consistent with which reviews are
    // APPROVED right now — a real bug caught during verification: reporting
    // an APPROVED review flipped it to FLAGGED here without recalculating,
    // leaving the vendor's average silently including a no-longer-visible
    // review until some unrelated future moderation action happened to
    // trigger a recalculation.
    if (review.status === "APPROVED") {
      await reviewRepository.recalculateVendorRating(review.vendorId);
    }
  }

  return report;
}

export async function moderateReview(reviewId: string, status: "APPROVED" | "REJECTED" | "FLAGGED" | "HIDDEN") {
  const review = await reviewRepository.findReviewById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  const updated = await reviewRepository.setReviewStatus(reviewId, status);

  // Rating aggregation must stay consistent with exactly which reviews are
  // publicly APPROVED — recalculated whenever a review's status changes to
  // or away from APPROVED, not just on the transition into it (e.g. an
  // admin later hiding a previously-approved review must also pull its
  // rating back out of the vendor's average).
  if (review.status === "APPROVED" || status === "APPROVED") {
    await reviewRepository.recalculateVendorRating(review.vendorId);
  }

  return updated;
}

export function listReviewsAdmin(filter: {
  status: "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED" | "HIDDEN" | undefined;
  page: number;
  limit: number;
}) {
  return Promise.all([reviewRepository.listReviewsAdmin(filter), reviewRepository.countReviewsAdmin(filter)]);
}

export async function getReviewAdmin(reviewId: string) {
  const review = await reviewRepository.findReviewById(reviewId);
  if (!review) {
    throw new NotFoundError("Review not found");
  }
  return review;
}
