import { z } from "zod";

// Backs the standalone /gallery browse page (Pinterest-style masonry +
// infinite scroll) — category is the GalleryCategory.slug, not its id, so
// the page's URL reads ?category=mehndi rather than a raw UUID.
export const listFeaturedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().min(1).optional(),
});

export type ListFeaturedQuery = z.infer<typeof listFeaturedQuerySchema>;

export const createFeaturedMediaSchema = z.object({
  mediaId: z.string().uuid(),
  galleryCategoryId: z.string().uuid().optional(),
  titleOverride: z.string().trim().max(200).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateFeaturedMediaSchema = z.object({
  galleryCategoryId: z.string().uuid().nullable().optional(),
  titleOverride: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateFeaturedMediaBody = z.infer<typeof createFeaturedMediaSchema>;
export type UpdateFeaturedMediaBody = z.infer<typeof updateFeaturedMediaSchema>;
