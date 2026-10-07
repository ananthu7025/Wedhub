import { env } from "../../config/env";
import { ExternalServiceError } from "../../common/errors";
import type { WhatsAppProvider, WhatsAppTemplateMessage } from "./whatsapp-provider";

// Meta WhatsApp Cloud API, direct (no BSP) — see
// PLAN-2026-09-30-whatsapp-notification-channel.md §7.1. Plain REST calls
// against the Graph API, matching this codebase's existing pattern for
// endpoints an SDK doesn't cover (razorpay.client.ts's raw fetch() fallback
// calls) rather than pulling in an extra dependency for what is a handful
// of well-documented POST requests.
const GRAPH_API_BASE = "https://graph.facebook.com";

function isConfigured(): boolean {
  return !!env.WHATSAPP_PHONE_NUMBER_ID && !!env.WHATSAPP_ACCESS_TOKEN;
}

export function isWhatsAppConfigured(): boolean {
  return isConfigured();
}

// Meta requires the recipient's phone in international format with no
// leading "+" in the `to` field (their docs show both accepted in
// practice, but the documented/guaranteed form omits it) — normalized here
// once so every caller can pass a plain E.164 string.
function normalizePhoneForMeta(e164: string): string {
  return e164.replace(/^\+/, "");
}

class MetaCloudApiWhatsAppProvider implements WhatsAppProvider {
  async sendTemplateMessage(message: WhatsAppTemplateMessage): Promise<{ messageId: string }> {
    if (!isConfigured()) {
      throw new ExternalServiceError(
        "WhatsApp is not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
      );
    }

    const url = `${GRAPH_API_BASE}/${env.WHATSAPP_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhoneForMeta(message.to),
        type: "template",
        template: {
          name: message.templateName,
          language: { code: message.languageCode },
          components:
            message.params.length > 0
              ? [
                  {
                    type: "body",
                    parameters: message.params.map((text) => ({ type: "text", text })),
                  },
                ]
              : [],
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new ExternalServiceError(`WhatsApp Cloud API rejected the message: ${errBody}`);
    }

    const data = (await response.json()) as { messages?: Array<{ id: string }> };
    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
      throw new ExternalServiceError("WhatsApp Cloud API accepted the request but returned no message id");
    }
    return { messageId };
  }
}

export const whatsAppProvider: WhatsAppProvider = new MetaCloudApiWhatsAppProvider();
