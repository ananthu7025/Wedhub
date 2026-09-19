import type { NotificationChannel, NotificationEventType } from "@prisma/client";
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

// Almost every event renders identically regardless of delivery channel, so
// a template is just `(data) => content`. VERIFICATION/PASSWORD_RESET/
// EMAIL_CHANGE_CONFIRMATION are the only exceptions: their EMAIL content
// necessarily embeds a raw, single-use auth token in the link (required for
// the email to be useful), but that same token must never sit in the
// Notification DB row an IN_APP channel persists (GET /notifications would
// return it verbatim to the token's owner — the actual vulnerability this
// fixes). For those three, the template function branches on the second
// `channel` argument to return a generic, token-free body for anything
// other than EMAIL. Every other template just ignores that argument, so
// this is additive, not a rewrite of the rendering system.
type Template = (data: TemplateData, channel: NotificationChannel) => NotificationContent;

const TEMPLATES: Record<NotificationEventType, Template> = {
  // REGISTRATION is declared (schema-complete) for a possible future
  // standalone "welcome" touch — the actual signup email is VERIFICATION
  // below, which carries both the welcome message and the one actionable
  // link a brand-new user needs. Confirmed with the user: sending both at
  // once would just be two emails in the same second, one with no action.
  REGISTRATION: () => ({
    title: "Welcome to itsmyKalyanam",
    body: "Your account has been created.",
  }),
  VERIFICATION: (data, channel) => {
    if (channel !== "EMAIL") {
      return {
        title: "Verify your email",
        body: "Verify your email to unlock all account features.",
      };
    }
    return {
      title: "Welcome to itsmyKalyanam — verify your email",
      body: `Your account has been created. Confirm your email address to activate it: ${env.FRONTEND_URL}/verify-email?token=${data.token ?? ""}`,
    };
  },
  PASSWORD_RESET: (data, channel) => {
    if (channel !== "EMAIL") {
      return {
        title: "Password reset requested",
        body: "A password reset was requested for your account. Check your email for the reset link. If this wasn't you, secure your account.",
      };
    }
    return {
      title: "Reset your password",
      body: `We received a request to reset your password. Use this link to choose a new one: ${env.FRONTEND_URL}/reset-password?token=${data.token ?? ""}. If you didn't request this, you can ignore this email.`,
    };
  },
  VENDOR_APPROVED: (data) => ({
    title: "Your vendor profile is approved",
    body: `${data.businessName ?? "Your business"} is now live on itsmyKalyanam and visible to couples searching your category and city.`,
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
  // data.senderName / data.preview are populated by messaging.service.ts's
  // sendMessage() — role-agnostic (fires for both couple->vendor and
  // vendor->couple sends), unlike USER_REPLIED above which is specifically
  // the vendor-facing "a couple replied to your lead" framing.
  NEW_MESSAGE: (data) => ({
    title: `New message${data.senderName ? ` from ${data.senderName}` : ""}`,
    body: data.preview ? String(data.preview) : "You have a new message.",
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
  LEAD_STATUS_UPDATED: (data) => ({
    title: "Your enquiry was updated",
    body: `${data.businessName ?? "A vendor"} moved your enquiry to "${data.status ?? "a new status"}". Check your enquiries for details.`,
  }),
  ACCOUNT_LINKED: () => ({
    title: "Your account was linked to Google sign-in",
    body: "Someone just signed in to your itsmyKalyanam account using Google for the first time. If this was you, no action is needed. If it wasn't, reset your password immediately.",
  }),
  EMAIL_CHANGE_CONFIRMATION: (data, channel) => {
    if (channel !== "EMAIL") {
      return {
        title: "Confirm your new email address",
        body: "Confirm your new email address to finish changing your account email. Check your email for the confirmation link.",
      };
    }
    return {
      title: "Confirm your new email address",
      body: `Confirm this email address to finish changing your itsmyKalyanam account email: ${env.FRONTEND_URL}/confirm-email-change?token=${data.token ?? ""}. Your current email stays active until you confirm. If you didn't request this, you can ignore this email.`,
    };
  },
};

export function renderNotification(
  eventType: NotificationEventType,
  data: TemplateData,
  channel: NotificationChannel,
): NotificationContent {
  return TEMPLATES[eventType](data, channel);
}

export function renderEmailHtml(content: NotificationContent): string {
  return `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
    <h2>${content.title}</h2>
    <p>${content.body}</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #888; font-size: 12px;">itsmyKalyanam</p>
  </div>`;
}
