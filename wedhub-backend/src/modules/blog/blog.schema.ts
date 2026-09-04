import { z } from "zod";

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(100),
  coverImageUrl: z.string().url().max(2000).nullable().optional(),
  excerpt: z.string().trim().min(1).max(500),
  bodyMarkdown: z.string().min(1),
  readTimeMinutes: z.coerce.number().int().min(1),
  publishedAt: z.coerce.date().nullable().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  seoTitle: z.string().trim().min(1).max(200).nullable().optional(),
  seoDescription: z.string().trim().min(1).max(500).nullable().optional(),
});

export const updateBlogPostSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  coverImageUrl: z.string().url().max(2000).nullable().optional(),
  excerpt: z.string().trim().min(1).max(500).optional(),
  bodyMarkdown: z.string().min(1).optional(),
  readTimeMinutes: z.coerce.number().int().min(1).optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  seoTitle: z.string().trim().min(1).max(200).nullable().optional(),
  seoDescription: z.string().trim().min(1).max(500).nullable().optional(),
});

export const listBlogPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateBlogPostBody = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostBody = z.infer<typeof updateBlogPostSchema>;
export type ListBlogPostsQuery = z.infer<typeof listBlogPostsQuerySchema>;
