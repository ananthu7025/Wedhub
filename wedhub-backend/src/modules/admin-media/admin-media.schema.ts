import { z } from "zod";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const createAdminImageUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateAdminImageUploadRequestBody = z.infer<typeof createAdminImageUploadRequestSchema>;

export { IMAGE_MIME_TYPES };
