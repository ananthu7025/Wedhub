import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createBookingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  clientName: z.string().trim().min(1, "Client / Couple name is required").max(120),
  clientPhone: z.string().trim().max(30).optional().nullable(),
  clientEmail: z.string().trim().email("Invalid email address").optional().nullable().or(z.literal("")),
  eventType: z.string().trim().min(1).default("Wedding"),
  startDate: z.string().regex(dateRegex, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(dateRegex, "endDate must be YYYY-MM-DD").optional(),
  shift: z.enum(["FULL_DAY", "MORNING", "EVENING"]).default("FULL_DAY"),
  startTime: z.string().trim().max(30).optional().nullable(),
  endTime: z.string().trim().max(30).optional().nullable(),
  venueName: z.string().trim().max(160).optional().nullable(),
  venueCity: z.string().trim().max(100).optional().nullable(),
  packageTitle: z.string().trim().max(120).optional().nullable(),
  totalAmount: z.number().min(0, "Amount must be >= 0").optional().nullable(),
  advancePaid: z.number().min(0, "Advance paid must be >= 0").optional().nullable(),
  status: z.enum(["CONFIRMED", "TENTATIVE", "COMPLETED", "CANCELLED"]).default("CONFIRMED"),
  notes: z.string().trim().max(2000).optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  coupleUserId: z.string().uuid().optional().nullable(),
});

export const updateBookingSchema = createBookingSchema.partial();

export const createBlackoutDateSchema = z.object({
  startDate: z.string().regex(dateRegex, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(dateRegex, "endDate must be YYYY-MM-DD").optional(),
  reason: z.string().trim().max(200).optional().nullable(),
});

export const updateCalendarSettingsSchema = z.object({
  maxBookingsPerDay: z.number().int().min(1).max(20).optional(),
  publicCalendarEnabled: z.boolean().optional(),
  regenerateIcalToken: z.boolean().optional(),
});

export const calendarMonthQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2050).default(() => new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).default(() => new Date().getMonth() + 1),
});

export const upcomingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CreateBlackoutDateInput = z.infer<typeof createBlackoutDateSchema>;
export type UpdateCalendarSettingsInput = z.infer<typeof updateCalendarSettingsSchema>;
