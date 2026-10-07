import type { NotificationEventType } from "@prisma/client";

// Unlike EMAIL/TELEGRAM (free-form text, rendered from notification.templates.ts
// at delivery time), a WhatsApp template message must name a template Meta has
// already approved — arbitrary title/body text cannot be sent this way. This
// map is the source of truth for which NotificationEventType values have an
// approved WhatsApp template and what it's called; starts empty because, as
// of this channel's initial build (see
// PLAN-2026-09-30-whatsapp-notification-channel.md §7.2), only one template
// (OTP verification) is planned, and that case is sent via
// sendWhatsAppDirect() (kind: "direct"), not through an eventType-driven
// notify() call — so no entry is needed here yet. Add an entry only once a
// template is actually approved in the Meta Business Manager for that event.
export const WHATSAPP_TEMPLATE_BY_EVENT: Partial<
  Record<NotificationEventType, { templateName: string; languageCode: string }>
> = {};

export function getWhatsAppTemplateForEvent(
  eventType: NotificationEventType,
): { templateName: string; languageCode: string } | undefined {
  return WHATSAPP_TEMPLATE_BY_EVENT[eventType];
}
