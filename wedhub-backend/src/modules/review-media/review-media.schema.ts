import { z } from "zod";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS_PER_REVIEW = 6;

export const createReviewPhotoUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateReviewPhotoUploadRequestBody = z.infer<typeof createReviewPhotoUploadRequestSchema>;

export { IMAGE_MIME_TYPES, MAX_PHOTOS_PER_REVIEW };
