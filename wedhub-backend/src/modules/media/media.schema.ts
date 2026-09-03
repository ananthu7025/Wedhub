import { z } from "zod";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"];

export const createUploadRequestSchema = z.object({
  mediaType: z.enum(["LOGO", "COVER", "PORTFOLIO", "VIDEO"]),
  albumId: z.string().uuid().optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.enum([...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES] as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export const updateMediaSchema = z.object({
  altText: z.string().max(300).optional(),
  sortOrder: z.coerce.number().int().optional(),
  albumId: z.string().uuid().nullable().optional(),
});

export const moderateMediaSchema = z.object({
  moderationStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"]),
});

export const listApprovedMediaAdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUploadRequestBody = z.infer<typeof createUploadRequestSchema>;
export type UpdateMediaBody = z.infer<typeof updateMediaSchema>;
export type ModerateMediaBody = z.infer<typeof moderateMediaSchema>;
export type ListApprovedMediaAdminQuery = z.infer<typeof listApprovedMediaAdminQuerySchema>;

export { IMAGE_MIME_TYPES, VIDEO_MIME_TYPES };
