import type { NotificationChannel, NotificationEventType } from "@prisma/client";

// Baseline channels for an event when the recipient has no explicit
// NotificationPreference row (opt-out model — product.md §45: "users and
// vendors can control channel preferences where appropriate", which implies
// a sane default, not silence, until someone actually configures anything).
//
// Account/business-critical events default to EMAIL + IN_APP. High-frequency
// lead/message events default to IN_APP only — emailing a vendor once per
// lead would be spammy for anyone with real deal flow; they can opt in via
// preferences if they want it. TELEGRAM is never defaulted on here — Arch
// Phase 15 (the bot itself) doesn't exist yet, and Telegram only becomes
// usable once a user has actually linked a Telegram identity — confirmed
// with the user.
export const DEFAULT_CHANNELS: Record<NotificationEventType, NotificationChannel[]> = {
  REGISTRATION: ["EMAIL", "IN_APP"],
  VERIFICATION: ["EMAIL", "IN_APP"],
  // Email-only: a locked-out user requesting a reset can't see in-app
  // notifications yet (they need the reset link to get back in at all).
  PASSWORD_RESET: ["EMAIL"],
  VENDOR_APPROVED: ["EMAIL", "IN_APP"],
  VENDOR_REJECTED: ["EMAIL", "IN_APP"],
  SUBSCRIPTION_ACTIVATED: ["EMAIL", "IN_APP"],
  PAYMENT_FAILED: ["EMAIL", "IN_APP"],
  SUBSCRIPTION_EXPIRING: ["EMAIL", "IN_APP"],
  REVIEW_RECEIVED: ["EMAIL", "IN_APP"],
  FEATURED_CAMPAIGN_STARTED: ["EMAIL", "IN_APP"],
  FEATURED_CAMPAIGN_ENDING: ["EMAIL", "IN_APP"],
  NEW_LEAD: ["IN_APP"],
  LEAD_REMINDER: ["IN_APP"],
  USER_REPLIED: ["IN_APP"],
  LEAD_FOLLOW_UP: ["IN_APP"],
  HIGH_INTENT_LEAD: ["IN_APP"],
  NEW_MESSAGE: ["IN_APP"],
};

export const MAX_DELIVERY_ATTEMPTS = 3;
