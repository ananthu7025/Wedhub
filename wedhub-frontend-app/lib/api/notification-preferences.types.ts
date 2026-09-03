/**
 * Backend response shapes for GET/PUT /notifications/me/preferences —
 * verified against wedhub-backend/src/modules/notifications during
 * Frontend Arch Phase 7 research. This is a generic, role-agnostic system
 * (preferences are keyed on userId, not role) — no vendor-specific
 * preferences module exists, this is the same one available to couples.
 *
 * Model is opt-out: the absence of a row for a given (eventType, channel)
 * pair means enabled, not disabled (see schema.prisma's comment on
 * NotificationPreference) — so an empty list from GET is a valid, fully
 * "everything enabled" state, not an error or empty state to special-case.
 *
 * Confirmed via research that SUBSCRIPTION_EXPIRING, FEATURED_CAMPAIGN_STARTED,
 * and FEATURED_CAMPAIGN_ENDING have templates but no code path anywhere
 * ever fires them (no scheduler exists) — toggles for these are real
 * (persist correctly) but functionally inert today.
 */

export type NotificationEventType =
  | "REGISTRATION"
  | "VERIFICATION"
  | "PASSWORD_RESET"
  | "VENDOR_APPROVED"
  | "VENDOR_REJECTED"
  | "NEW_LEAD"
  | "LEAD_REMINDER"
  | "USER_REPLIED"
  | "LEAD_FOLLOW_UP"
  | "HIGH_INTENT_LEAD"
  | "NEW_MESSAGE"
  | "REVIEW_RECEIVED"
  | "SUBSCRIPTION_ACTIVATED"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_EXPIRING"
  | "FEATURED_CAMPAIGN_STARTED"
  | "FEATURED_CAMPAIGN_ENDING"
  // Added 2026-09-03 (docs/bugs.md #4) — fires on every lead status change,
  // notifying the couple who submitted the enquiry.
  | "LEAD_STATUS_UPDATED";

export type NotificationChannel = "IN_APP" | "EMAIL" | "TELEGRAM";

// ---- GET /notifications/me/preferences ----
export interface NotificationPreference {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- PUT /notifications/me/preferences ----
export interface SetPreferenceBody {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  isEnabled: boolean;
}
