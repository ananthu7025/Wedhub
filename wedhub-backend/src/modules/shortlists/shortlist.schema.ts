import { z } from "zod";

export const createShortlistSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateShortlistSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const addItemSchema = z.object({
  vendorId: z.string().uuid(),
  note: z.string().max(300).optional(),
});

export type CreateShortlistBody = z.infer<typeof createShortlistSchema>;
export type UpdateShortlistBody = z.infer<typeof updateShortlistSchema>;
export type AddItemBody = z.infer<typeof addItemSchema>;
