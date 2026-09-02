import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
