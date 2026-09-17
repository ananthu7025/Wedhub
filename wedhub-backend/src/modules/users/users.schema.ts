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
  // User.phone, not UserProfile — item 7: previously collected at signup
  // but never editable afterward (account page rendered it as a disabled
  // input). Nullable so a customer can clear a phone they no longer want
  // on file, same "omitUndefined only strips undefined" pattern as
  // upsertProfileSchema's nullable fields elsewhere in the codebase.
  phone: z.string().min(6).max(20).nullable().optional(),
});

export const upsertWeddingProfileSchema = z.object({
  weddingDate: z.string().datetime().optional(),
  guestCount: z.coerce.number().int().min(0).max(100000).optional(),
  estimatedBudget: z.coerce.number().min(0).optional(),
  weddingStyle: z.string().max(100).optional(),
  partnerName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

// Couple profile-setup wizard (item 2, 2026-09-16 request) — a richer,
// dedicated submission distinct from the flat upsertWeddingProfileSchema
// above (which predates the wizard and stays as the account page's
// lightweight quick-edit form). One transaction on the service side writes
// all three pieces together: the summary fields, the per-function event
// dates, and the per-category budget preferences.
const FUNCTION_TYPES = ["ENGAGEMENT", "SANGEET", "MEHENDI", "HALDI", "WEDDING", "RECEPTION", "OTHER"] as const;

const eventDateSchema = z
  .object({
    functionType: z.enum(FUNCTION_TYPES),
    otherLabel: z.string().trim().max(100).optional(),
    date: z.string().date("Invalid date — expected YYYY-MM-DD"),
    time: z.string().max(20).optional(),
    guestCount: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .refine((data) => data.functionType !== "OTHER" || (data.otherLabel && data.otherLabel.length > 0), {
    message: "otherLabel is required when functionType is OTHER",
    path: ["otherLabel"],
  });

const categoryPreferenceSchema = z
  .object({
    categoryId: z.string().uuid(),
    budgetMin: z.coerce.number().min(0).optional(),
    budgetMax: z.coerce.number().min(0).optional(),
  })
  .refine((data) => data.budgetMin === undefined || data.budgetMax === undefined || data.budgetMin <= data.budgetMax, {
    message: "budgetMin must be less than or equal to budgetMax",
    path: ["budgetMax"],
  });

export const submitProfileSetupSchema = z.object({
  // Required, not optional — Phase 6's vendor matching (item 8) filters by
  // city, and matching a couple to vendors with no location at all would
  // surface irrelevant far-away vendors and send low-quality leads. Added
  // 2026-09-16 after discovering the wizard had never actually collected
  // this despite WeddingProfile.cityId existing on the schema since before
  // this wizard was built.
  cityId: z.string().uuid("Please select your wedding city"),
  guestCount: z.coerce.number().int().min(0).max(100000).optional(),
  weddingStyle: z.string().max(100).optional(),
  partnerName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  eventDates: z.array(eventDateSchema).min(1, "At least one event date is required"),
  categoryPreferences: z.array(categoryPreferenceSchema).min(1, "At least one category is required"),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UpsertWeddingProfileBody = z.infer<typeof upsertWeddingProfileSchema>;
export type SubmitProfileSetupBody = z.infer<typeof submitProfileSetupSchema>;
export type EventDateInput = z.infer<typeof eventDateSchema>;
export type CategoryPreferenceInput = z.infer<typeof categoryPreferenceSchema>;
