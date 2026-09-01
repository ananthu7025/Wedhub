import { z } from "zod";

const notificationPreferencesSchema = z.object({
  emailMarketing: z.boolean(),
  emailTransactional: z.boolean(),
  smsEnabled: z.boolean(),
});

const preferencesSchema = z.object({
  notifications: notificationPreferencesSchema,
  preferredCategories: z.array(z.string()),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(2000).optional(),
  preferences: preferencesSchema.optional(),
});

export const upsertWeddingProfileSchema = z.object({
  weddingDate: z.string().datetime().optional(),
  guestCount: z.coerce.number().int().min(0).max(100000).optional(),
  estimatedBudget: z.coerce.number().min(0).optional(),
  weddingStyle: z.string().max(100).optional(),
  partnerName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UpsertWeddingProfileBody = z.infer<typeof upsertWeddingProfileSchema>;
