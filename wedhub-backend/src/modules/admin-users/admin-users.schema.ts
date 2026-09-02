import { z } from "zod";

// product.md §39's "Users: Reported" has no backing data source in this
// schema — ReviewReport ties a reporter to a REVIEW, not to a user, so
// there is no real "this user was reported" record to filter on. Omitted
// rather than faked via inference (e.g. "authored a reported review").
export const listUsersQuerySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
  role: z.enum(["END_USER", "VENDOR", "ADMIN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const suspendUserSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type SuspendUserBody = z.infer<typeof suspendUserSchema>;
