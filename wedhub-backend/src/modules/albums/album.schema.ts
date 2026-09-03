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

// Admin creating/updating an album on a vendor's behalf (cold-start
// seeding for Wedding Stories — see album.service.ts's
// createAlbumForVendor). Same fields as the vendor-self schemas above,
// plus an explicit vendorId on create since there's no "own vendor" to
// infer it from.
export const createAlbumForVendorSchema = createAlbumSchema.extend({
  vendorId: z.string().uuid(),
});

export type CreateAlbumBody = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumBody = z.infer<typeof updateAlbumSchema>;
export type CreateAlbumForVendorBody = z.infer<typeof createAlbumForVendorSchema>;
