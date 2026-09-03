import { z } from "zod";

const EVENT_TYPES = [
  "REGISTRATION",
  "VERIFICATION",
  "PASSWORD_RESET",
  "VENDOR_APPROVED",
  "VENDOR_REJECTED",
  "NEW_LEAD",
  "LEAD_REMINDER",
  "USER_REPLIED",
  "LEAD_FOLLOW_UP",
  "HIGH_INTENT_LEAD",
  "NEW_MESSAGE",
  "REVIEW_RECEIVED",
  "SUBSCRIPTION_ACTIVATED",
  "PAYMENT_FAILED",
  "SUBSCRIPTION_EXPIRING",
  "FEATURED_CAMPAIGN_STARTED",
  "FEATURED_CAMPAIGN_ENDING",
  "LEAD_STATUS_UPDATED",
] as const;

const CHANNELS = ["IN_APP", "EMAIL", "TELEGRAM"] as const;

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const setPreferenceSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  channel: z.enum(CHANNELS),
  isEnabled: z.boolean(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type SetPreferenceBody = z.infer<typeof setPreferenceSchema>;
