import { z } from "zod";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Feature spec: "Gallery — Multiple wedding photos", no stated cap — kept
// generous rather than arbitrarily tight, matching the spec's "do not
// unnecessarily restrict... unless there is an existing business rule"
// principle (stated for events, applied the same way here).
const MAX_GALLERY_PHOTOS = 30;

export const createWeddingWebsiteUploadRequestSchema = z.object({
  weddingWebsiteId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateWeddingWebsiteUploadRequestBody = z.infer<typeof createWeddingWebsiteUploadRequestSchema>;

export { IMAGE_MIME_TYPES, MAX_GALLERY_PHOTOS };
