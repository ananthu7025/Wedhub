import { z } from "zod";

export const createWeddingStorySchema = z.object({
  albumId: z.string().uuid(),
  coupleName: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  tag: z.string().trim().min(1).max(200),
  snippet: z.string().trim().min(1).max(500),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateWeddingStorySchema = z.object({
  coupleName: z.string().trim().min(1).max(200).optional(),
  location: z.string().trim().min(1).max(200).optional(),
  tag: z.string().trim().min(1).max(200).optional(),
  snippet: z.string().trim().min(1).max(500).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateWeddingStoryBody = z.infer<typeof createWeddingStorySchema>;
export type UpdateWeddingStoryBody = z.infer<typeof updateWeddingStorySchema>;
