import { z } from "zod";

export const createPopularSearchCardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  locationBlurb: z.string().trim().min(1).max(200),
  priceLabel: z.string().trim().min(1).max(100),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  searchQuery: z.string().trim().min(1).max(200),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updatePopularSearchCardSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  locationBlurb: z.string().trim().min(1).max(200).optional(),
  priceLabel: z.string().trim().min(1).max(100).optional(),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  searchQuery: z.string().trim().min(1).max(200).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreatePopularSearchCardBody = z.infer<typeof createPopularSearchCardSchema>;
export type UpdatePopularSearchCardBody = z.infer<typeof updatePopularSearchCardSchema>;
