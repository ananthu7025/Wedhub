import type { Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function findVendorStatus(vendorId: string) {
  return prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, status: true, ownerUserId: true } });
}

export function findExistingReview(userId: string, vendorId: string) {
  return prisma.review.findUnique({ where: { userId_vendorId: { userId, vendorId } } });
}

export function hasAnyLeadWithVendor(userId: string, vendorId: string) {
  return prisma.lead.findFirst({
    where: { vendorId, enquiry: { userId } },
    select: { id: true },
  });
}

export function createReview(data: {
  userId: string;
  vendorId: string;
  serviceId: string | undefined;
  rating: number;
  title: string | undefined;
  content: string | undefined;
  eventDate: Date | undefined;
  verifiedInteraction: boolean;
}) {
  const fields = omitUndefined({
    serviceId: data.serviceId,
    title: data.title,
    content: data.content,
    eventDate: data.eventDate,
  });
  return prisma.review.create({
    data: {
      userId: data.userId,
      vendorId: data.vendorId,
      rating: data.rating,
      verifiedInteraction: data.verifiedInteraction,
      ...fields,
    },
  });
}

export function findReviewById(id: string) {
  return prisma.review.findUnique({ where: { id }, include: { reports: true } });
}

export function listVendorReviews(vendorId: string, page: number, limit: number) {
  return prisma.review.findMany({
    where: { vendorId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export function countVendorReviews(vendorId: string) {
  return prisma.review.count({ where: { vendorId, status: "APPROVED" } });
}

export function addVendorResponse(id: string, vendorResponse: string) {
  return prisma.review.update({
    where: { id },
    data: { vendorResponse, vendorRespondedAt: new Date() },
  });
}

export function createReport(reviewId: string, reporterId: string, reason: string) {
  return prisma.reviewReport.create({ data: { reviewId, reporterId, reason } });
}

export function findExistingReport(reviewId: string, reporterId: string) {
  return prisma.reviewReport.findUnique({ where: { reviewId_reporterId: { reviewId, reporterId } } });
}

export function setReviewStatus(id: string, status: ReviewStatus) {
  return prisma.review.update({ where: { id }, data: { status } });
}

export function listReviewsAdmin(filter: { status: ReviewStatus | undefined; page: number; limit: number }) {
  const where: Prisma.ReviewWhereInput = filter.status ? { status: filter.status } : {};
  return prisma.review.findMany({
    where,
    include: { vendor: { select: { id: true, businessName: true, slug: true } }, reports: true },
    orderBy: { createdAt: "desc" },
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countReviewsAdmin(filter: { status: ReviewStatus | undefined }) {
  const where: Prisma.ReviewWhereInput = filter.status ? { status: filter.status } : {};
  return prisma.review.count({ where });
}

// Recalculated from real Review rows rather than incrementally maintained,
// same precedent as Arch Phase 5's recalculateCompleteness — simpler and
// self-healing (never drifts from the underlying data) at the cost of an
// aggregate query per write, acceptable at this scale.
export async function recalculateVendorRating(vendorId: string): Promise<void> {
  const result = await prisma.review.aggregate({
    where: { vendorId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      averageRating: result._avg.rating ?? 0,
      reviewCount: result._count.rating,
    },
  });
}
