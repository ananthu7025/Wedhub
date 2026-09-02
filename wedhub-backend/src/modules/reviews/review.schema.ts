import { z } from "zod";

export const createReviewSchema = z.object({
  vendorId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().max(3000).optional(),
  eventDate: z.coerce.date().optional(),
  // Ids from POST /review-media/upload-requests, already uploaded+confirmed
  // and owned by the caller — see review-media module. Optional: a review
  // with no photos is the common case.
  mediaIds: z.array(z.string().uuid()).max(6).optional(),
});

export const respondToReviewSchema = z.object({
  vendorResponse: z.string().trim().min(1).max(2000),
});

export const reportReviewSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "FLAGGED", "HIDDEN"]),
});

export const listVendorReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listReviewsAdminQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED", "HIDDEN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listMyReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateReviewBody = z.infer<typeof createReviewSchema>;
export type RespondToReviewBody = z.infer<typeof respondToReviewSchema>;
export type ReportReviewBody = z.infer<typeof reportReviewSchema>;
export type ModerateReviewBody = z.infer<typeof moderateReviewSchema>;
export type ListVendorReviewsQuery = z.infer<typeof listVendorReviewsQuerySchema>;
export type ListReviewsAdminQuery = z.infer<typeof listReviewsAdminQuerySchema>;
export type ListMyReviewsQuery = z.infer<typeof listMyReviewsQuerySchema>;
