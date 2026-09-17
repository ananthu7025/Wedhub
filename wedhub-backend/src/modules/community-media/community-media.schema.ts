import { z } from "zod";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
// One photo per post, per the confirmed scope decision (text + optional
// single image) — smaller than review-media's 6, since community posts are
// text-first, not a photo gallery.
const MAX_PHOTOS_PER_POST = 1;

export const createCommunityPhotoUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateCommunityPhotoUploadRequestBody = z.infer<typeof createCommunityPhotoUploadRequestSchema>;

export { IMAGE_MIME_TYPES, MAX_PHOTOS_PER_POST };
