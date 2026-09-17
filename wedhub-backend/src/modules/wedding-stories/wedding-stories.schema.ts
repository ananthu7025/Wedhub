import { z } from "zod";

export const createWeddingStorySchema = z.object({
  albumId: z.string().uuid(),
  coupleName: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  tag: z.string().trim().min(1).max(200),
  snippet: z.string().trim().min(1).max(500),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateWeddingStorySchema = z.object({
  coupleName: z.string().trim().min(1).max(200).optional(),
  location: z.string().trim().min(1).max(200).optional(),
  tag: z.string().trim().min(1).max(200).optional(),
  snippet: z.string().trim().min(1).max(500).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// Item 10/11 — vendor-facing submission. No isFeatured/sortOrder (those
// stay admin-only editorial controls, set via updateWeddingStorySchema
// above after approval) and no direct status (a vendor can't self-approve).
export const submitWeddingStorySchema = z.object({
  albumId: z.string().uuid(),
  coupleName: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  tag: z.string().trim().min(1).max(200),
  snippet: z.string().trim().min(1).max(500),
  collaboratorVendorIds: z.array(z.string().uuid()).max(10).optional(),
});

export const respondToCollaborationSchema = z.object({
  decision: z.enum(["CONFIRMED", "DECLINED"]),
});

export const updateWeddingStoryStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

export type CreateWeddingStoryBody = z.infer<typeof createWeddingStorySchema>;
export type UpdateWeddingStoryBody = z.infer<typeof updateWeddingStorySchema>;
export type SubmitWeddingStoryBody = z.infer<typeof submitWeddingStorySchema>;
export type RespondToCollaborationBody = z.infer<typeof respondToCollaborationSchema>;
export type UpdateWeddingStoryStatusBody = z.infer<typeof updateWeddingStoryStatusSchema>;
