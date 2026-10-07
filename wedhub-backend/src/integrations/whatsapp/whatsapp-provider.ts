// See PLAN-2026-09-30-whatsapp-notification-channel.md §4a. Deliberately
// narrower than telegram/messaging-provider.ts's MessagingProvider — the
// WhatsApp Business Platform Cloud API has no session/conversation concept
// for a provider-initiated send, and every send this codebase does is
// provider-initiated (an OTP, a notification), never a reply inside an
// existing customer-service window. Only template-message sending is
// modeled; see the plan's §4a for why that's not an artificial narrowing.
export interface WhatsAppTemplateMessage {
  to: string; // E.164 phone number, e.g. "+919876543210"
  templateName: string; // Meta-approved template name, e.g. "otp_verification"
  languageCode: string; // e.g. "en" or "en_US" — must match the approved template
  params: string[]; // positional template variables, e.g. [code] for "Your code is {{1}}"
}

export interface WhatsAppProvider {
  sendTemplateMessage(message: WhatsAppTemplateMessage): Promise<{ messageId: string }>;
}
