import type { NotificationEventType } from "@prisma/client";
import { env } from "../../config/env";

export interface NotificationContent {
  title: string;
  body: string;
}

// Keys are a subset of the fields a given event's template needs — callers
// pass whatever's relevant for that event type (see notification.service's
// NotifyInput.data). Kept as loosely-typed strings rather than a per-event
// discriminated union: this is 16 short templates, not a reusable rendering
// system, and a heavier type here would buy nothing a wrong call site
// wouldn't already catch via a missing/undefined value showing up blank.
export type TemplateData = Record<string, string | number | undefined>;

const TEMPLATES: Record<NotificationEventType, (data: TemplateData) => NotificationContent> = {
  // REGISTRATION is declared (schema-complete) for a possible future
  // standalone "welcome" touch — the actual signup email is VERIFICATION
  // below, which carries both the welcome message and the one actionable
  // link a brand-new user needs. Confirmed with the user: sending both at
  // once would just be two emails in the same second, one with no action.
  REGISTRATION: () => ({
    title: "Welcome to WedHub",
    body: "Your account has been created.",
  }),
  VERIFICATION: (data) => ({
    title: "Welcome to WedHub — verify your email",
    body: `Your account has been created. Confirm your email address to activate it: ${env.FRONTEND_URL}/verify-email?token=${data.token ?? ""}`,
  }),
  PASSWORD_RESET: (data) => ({
    title: "Reset your password",
    body: `We received a request to reset your password. Use this link to choose a new one: ${env.FRONTEND_URL}/reset-password?token=${data.token ?? ""}. If you didn't request this, you can ignore this email.`,
  }),
  VENDOR_APPROVED: (data) => ({
    title: "Your vendor profile is approved",
    body: `${data.businessName ?? "Your business"} is now live on WedHub and visible to couples searching your category and city.`,
  }),
  VENDOR_REJECTED: (data) => ({
    title: "Your vendor profile needs changes",
    body: `${data.businessName ?? "Your business"} was not approved. Reason: ${data.reason ?? "not specified"}. You can update your profile and resubmit.`,
  }),
  NEW_LEAD: (data) => ({
    title: "New lead received",
    body: `You have a new enquiry${data.businessName ? ` for ${data.businessName}` : ""}. Respond promptly to improve your conversion rate.`,
  }),
  LEAD_REMINDER: () => ({
    title: "Lead awaiting response",
    body: "You have a lead that hasn't been responded to yet.",
  }),
  USER_REPLIED: () => ({
    title: "New reply on your lead",
    body: "A couple replied to your conversation.",
  }),
  LEAD_FOLLOW_UP: () => ({
    title: "Follow-up reminder",
    body: "It's time to follow up on one of your leads.",
  }),
  HIGH_INTENT_LEAD: () => ({
    title: "High-intent lead",
    body: "You have a lead showing strong booking intent — respond quickly.",
  }),
  NEW_MESSAGE: () => ({
    title: "New message",
    body: "You have a new message.",
  }),
  REVIEW_RECEIVED: (data) => ({
    title: "New review received",
    body: `${data.reviewerName ?? "A customer"} left you a ${data.rating ?? "?"}-star review.`,
  }),
  SUBSCRIPTION_ACTIVATED: (data) => ({
    title: "Subscription activated",
    body: `Your ${data.planName ?? ""} subscription is now active.`,
  }),
  PAYMENT_FAILED: () => ({
    title: "Payment failed",
    body: "Your recent subscription payment failed. Please update your payment method to avoid losing paid features.",
  }),
  SUBSCRIPTION_EXPIRING: (data) => ({
    title: "Subscription expiring soon",
    body: `Your ${data.planName ?? ""} subscription ends on ${data.expiresAt ?? "soon"}. Renew to keep your paid features.`,
  }),
  FEATURED_CAMPAIGN_STARTED: (data) => ({
    title: "Featured campaign started",
    body: `Your featured placement${data.placement ? ` (${data.placement})` : ""} is now live.`,
  }),
  FEATURED_CAMPAIGN_ENDING: (data) => ({
    title: "Featured campaign ending",
    body: `Your featured placement${data.placement ? ` (${data.placement})` : ""} ends soon.`,
  }),
};

export function renderNotification(eventType: NotificationEventType, data: TemplateData): NotificationContent {
  return TEMPLATES[eventType](data);
}

export function renderEmailHtml(content: NotificationContent): string {
  return `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
    <h2>${content.title}</h2>
    <p>${content.body}</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #888; font-size: 12px;">WedHub</p>
  </div>`;
}
