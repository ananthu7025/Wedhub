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

// Admin-only, platform-owned image for a PopularSearchCard — same shape as
// createAdminImageUploadRequestSchema above (Category's homepage image),
// kept as its own schema/route pair since it produces a POPULAR_SEARCH_IMAGE
// rather than a CATEGORY_IMAGE (see MediaType enum comment in schema.prisma).
export const createPopularSearchImageUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreatePopularSearchImageUploadRequestBody = z.infer<typeof createPopularSearchImageUploadRequestSchema>;

// Admin-only, platform-owned image for a BlogPost's cover — same shape as
// createAdminImageUploadRequestSchema/createPopularSearchImageUploadRequestSchema
// above, kept as its own schema/route pair since it produces a
// BLOG_COVER_IMAGE rather than CATEGORY_IMAGE/POPULAR_SEARCH_IMAGE (see
// MediaType enum comment in schema.prisma).
export const createBlogCoverImageUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateBlogCoverImageUploadRequestBody = z.infer<typeof createBlogCoverImageUploadRequestSchema>;

export { IMAGE_MIME_TYPES };
