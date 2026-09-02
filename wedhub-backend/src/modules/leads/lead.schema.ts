import { z } from "zod";

const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "RESPONDED",
  "QUALIFIED",
  "MEETING",
  "QUOTED",
  "WON",
  "LOST",
  "SPAM",
  "CLOSED",
] as const;

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  reason: z.string().max(500).optional(),
});

export const createLeadNoteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const listLeadsQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateLeadStatusBody = z.infer<typeof updateLeadStatusSchema>;
export type CreateLeadNoteBody = z.infer<typeof createLeadNoteSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export { LEAD_STATUSES };
