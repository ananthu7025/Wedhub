import { z } from "zod";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const createAdminImageUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateAdminImageUploadRequestBody = z.infer<typeof createAdminImageUploadRequestSchema>;

// Admin uploading a real PORTFOLIO photo on a vendor's behalf (cold-start
// seeding — see admin-media.service.ts's createVendorUploadRequest for why
// this exists). albumId is optional so an admin can attach straight to an
// album in one step, same as the vendor's own upload flow.
export const createAdminVendorUploadRequestSchema = z.object({
  vendorId: z.string().uuid(),
  albumId: z.string().uuid().optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateAdminVendorUploadRequestBody = z.infer<typeof createAdminVendorUploadRequestSchema>;

export { IMAGE_MIME_TYPES };
