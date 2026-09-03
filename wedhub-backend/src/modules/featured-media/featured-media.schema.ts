import { z } from "zod";

export const createFeaturedMediaSchema = z.object({
  mediaId: z.string().uuid(),
  titleOverride: z.string().trim().max(200).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateFeaturedMediaSchema = z.object({
  titleOverride: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateFeaturedMediaBody = z.infer<typeof createFeaturedMediaSchema>;
export type UpdateFeaturedMediaBody = z.infer<typeof updateFeaturedMediaSchema>;
