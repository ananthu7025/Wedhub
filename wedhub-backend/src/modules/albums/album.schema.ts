import { z } from "zod";

export const createAlbumSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export const updateAlbumSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(1000).optional(),
  coverMediaId: z.string().uuid().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CreateAlbumBody = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumBody = z.infer<typeof updateAlbumSchema>;
