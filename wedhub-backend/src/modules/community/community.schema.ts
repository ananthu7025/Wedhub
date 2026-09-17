import { z } from "zod";

const basePostFields = {
  tagId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  // Id from POST /community-media/upload-requests, already uploaded+confirmed
  // and owned by the caller — see community-media module. Optional: a post
  // with no photo is the common case.
  mediaId: z.string().uuid().optional(),
};

const createTextPostSchema = z.object({
  ...basePostFields,
  postType: z.literal("TEXT").default("TEXT"),
  body: z.string().trim().min(1).max(5000),
});

const createPollPostSchema = z.object({
  ...basePostFields,
  postType: z.literal("POLL"),
  // Optional context text below the poll question (the question itself is
  // `title`, same field a TEXT post uses).
  body: z.string().trim().max(5000).optional(),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(6),
});

export const createPostSchema = z.discriminatedUnion("postType", [createTextPostSchema, createPollPostSchema]);

export const createCommentSchema = z.object({
  parentId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2000),
});

export const castPollVoteSchema = z.object({
  optionId: z.string().uuid(),
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
export type CastPollVoteBody = z.infer<typeof castPollVoteSchema>;
export type ReportPostBody = z.infer<typeof reportPostSchema>;
export type ModeratePostBody = z.infer<typeof moderatePostSchema>;
export type ListFeedQuery = z.infer<typeof listFeedQuerySchema>;
export type ListFlaggedAdminQuery = z.infer<typeof listFlaggedAdminQuerySchema>;
