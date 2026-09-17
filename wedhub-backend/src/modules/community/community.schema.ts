import { z } from "zod";

export const createPostSchema = z.object({
  tagId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  // Id from POST /community-media/upload-requests, already uploaded+confirmed
  // and owned by the caller — see community-media module. Optional: a post
  // with no photo is the common case.
  mediaId: z.string().uuid().optional(),
});

export const createCommentSchema = z.object({
  parentId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2000),
});

export const reportPostSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const moderatePostSchema = z.object({
  status: z.enum(["VISIBLE", "HIDDEN"]),
});

export const listFeedQuerySchema = z.object({
  tagId: z.string().uuid().optional(),
  sort: z.enum(["hot", "new"]).default("hot"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listFlaggedAdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePostBody = z.infer<typeof createPostSchema>;
export type CreateCommentBody = z.infer<typeof createCommentSchema>;
export type ReportPostBody = z.infer<typeof reportPostSchema>;
export type ModeratePostBody = z.infer<typeof moderatePostSchema>;
export type ListFeedQuery = z.infer<typeof listFeedQuerySchema>;
export type ListFlaggedAdminQuery = z.infer<typeof listFlaggedAdminQuerySchema>;
