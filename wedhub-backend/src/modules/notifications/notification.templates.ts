import type { NotificationChannel, NotificationEventType } from "@prisma/client";
import { env } from "../../config/env";

export interface NotificationContent {
  title: string;
  body: string;
  // Optional: when a template wants a styled CTA button in the EMAIL
  // rendering instead of (or in addition to) a plain-text link inside body —
  // see VERIFICATION below. Ignored by IN_APP/other channels and by
  // renderEmailHtml's generic branch for any template that doesn't set it.
  cta?: { label: string; url: string };
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
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${data.token ?? ""}`;
    return {
      title: "Welcome to itsmyKalyanam — verify your email",
      body: `Your account has been created. Confirm your email address to activate it: ${verifyUrl}`,
      cta: { label: "Verify email address", url: verifyUrl },
    };
  },
  PASSWORD_RESET: (data, channel) => {
    if (channel !== "EMAIL") {
      return {
        title: "Password reset requested",
        body: "A password reset was requested for your account. Check your email for the reset link. If this wasn't you, secure your account.",
      };
    }
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${data.token ?? ""}`;
    return {
      title: "Reset your password",
      body: `We received a request to reset your password. Use this link to choose a new one: ${resetUrl}. If you didn't request this, you can ignore this email.`,
      cta: { label: "Reset password", url: resetUrl },
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
  // Item 9 — data.businessName/data.completeness/data.missingCount come from
  // profile-completion-reminder.schedule.ts. CTA always points at
  // /vendor/settings so the vendor lands directly on the form, not just the
  // dashboard.
  PROFILE_COMPLETION_REMINDER: (data, channel) => {
    const completeness = data.completeness ?? "your";
    const settingsUrl = `${env.FRONTEND_URL}/vendor/settings`;
    const title = "Your profile is this close to done 👀";
    const body = `${data.businessName ?? "Your listing"} is ${completeness}% complete — couples can't fall in love with a profile they can't fully see. A few more details and you're ready to start getting enquiries.`;
    if (channel !== "EMAIL") {
      return { title, body };
    }
    return { title, body, cta: { label: "Finish my profile", url: settingsUrl } };
  },
  EMAIL_CHANGE_CONFIRMATION: (data, channel) => {
    if (channel !== "EMAIL") {
      return {
        title: "Confirm your new email address",
        body: "Confirm your new email address to finish changing your account email. Check your email for the confirmation link.",
      };
    }
    const confirmUrl = `${env.FRONTEND_URL}/confirm-email-change?token=${data.token ?? ""}`;
    return {
      title: "Confirm your new email address",
      body: `Confirm this email address to finish changing your itsmyKalyanam account email: ${confirmUrl}. Your current email stays active until you confirm. If you didn't request this, you can ignore this email.`,
      cta: { label: "Confirm new email", url: confirmUrl },
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

const BRAND_PRIMARY = "#e00b41";
const BRAND_INK = "#111111";
const TEXT_GREY = "#526170";

// HTML-escapes template data before it lands in the email — content.title/body
// are built from our own template strings above, but data.businessName,
// data.reviewerName, etc. (see the TEMPLATES map) originate from user input
// (a vendor's business name, a reviewer's display name) and flow through
// unescaped otherwise, which would let one user's chosen name break another
// recipient's email markup.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Table-based layout with inline styles throughout — the only markup style
// that renders consistently across Outlook/Gmail/Apple Mail, none of which
// reliably support a <style> block or modern CSS layout. Kept intentionally
// simple (single card, one optional button) rather than a full design
// system: this covers all 16 NotificationEventType templates through one
// shared shell, not a different layout per event.
export function renderEmailHtml(content: NotificationContent): string {
  const title = escapeHtml(content.title);
  // content.body already embeds a raw URL for CTA-less templates (every
  // event except VERIFICATION/PASSWORD_RESET/EMAIL_CHANGE_CONFIRMATION) —
  // turn that into a clickable link rather than plain text, since escaping
  // alone would leave it unclickable.
  const bodyHtml = escapeHtml(content.body).replace(
    /(https?:\/\/[^\s]+)/g,
    (url) => `<a href="${url}" style="color: ${BRAND_PRIMARY};">${url}</a>`,
  );

  const button = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
        <tr>
          <td style="border-radius: 8px; background-color: ${BRAND_PRIMARY};">
            <a href="${content.cta.url}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px;">
              ${escapeHtml(content.cta.label)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 24px; font-size: 12px; color: ${TEXT_GREY}; word-break: break-all;">
        Or paste this link into your browser:<br />
        <a href="${content.cta.url}" style="color: ${BRAND_PRIMARY};">${content.cta.url}</a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="padding: 28px 32px 0;">
                <span style="font-size: 18px; font-weight: 800; color: ${BRAND_INK};">itsmy<span style="color: ${BRAND_PRIMARY};">Kalyanam</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 32px;">
                <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: ${BRAND_INK};">${title}</h1>
                <p style="margin: 0 0 4px; font-size: 14px; line-height: 1.6; color: ${TEXT_GREY};">${bodyHtml}</p>
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 32px; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 12px; color: #9aa3ab;">
                  itsmyKalyanam &middot; You're receiving this because of activity on your account.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
