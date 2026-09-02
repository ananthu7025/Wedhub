import TelegramBot from "node-telegram-bot-api";
import { timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { ExternalServiceError } from "../../common/errors";
import type { InlineButton, MessagingProvider, SendMessageOptions } from "./messaging-provider";

let client: TelegramBot | undefined;

function isConfigured(): boolean {
  return !!env.TELEGRAM_BOT_TOKEN;
}

export function isTelegramConfigured(): boolean {
  return isConfigured();
}

function getClient(): TelegramBot {
  if (!isConfigured()) {
    throw new ExternalServiceError("Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN.");
  }
  if (!client) {
    // No polling — this process receives updates exclusively via the
    // registered webhook (see telegram.routes.ts), matching the rest of
    // this codebase's webhook-driven integrations (Razorpay).
    client = new TelegramBot(env.TELEGRAM_BOT_TOKEN as string, { polling: false, webHook: false });
  }
  return client;
}

function toInlineKeyboard(buttons: InlineButton[][]) {
  return {
    inline_keyboard: buttons.map((row) => row.map((btn) => ({ text: btn.text, callback_data: btn.callbackData }))),
  };
}

class TelegramProvider implements MessagingProvider {
  async sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<{ messageId: string }> {
    const message = await getClient().sendMessage(chatId, text, {
      ...(options?.buttons ? { reply_markup: toInlineKeyboard(options.buttons) } : {}),
    });
    return { messageId: String(message.message_id) };
  }

  async sendMedia(chatId: string, mediaUrl: string, caption: string | undefined): Promise<{ messageId: string }> {
    const message = await getClient().sendPhoto(chatId, mediaUrl, caption !== undefined ? { caption } : {});
    return { messageId: String(message.message_id) };
  }

  // No Telegram-side concept of opening/closing a conversation — the state
  // machine is entirely ours (telegram.conversation.service). Present only
  // to satisfy the cross-provider MessagingProvider interface.
  async createConversation(): Promise<void> {}
  async closeConversation(): Promise<void> {}
}

export const telegramProvider: MessagingProvider = new TelegramProvider();

// Telegram-specific UX (acknowledging a button tap so the client stops
// showing a loading spinner) — deliberately not part of MessagingProvider,
// since it has no equivalent in a generic messaging abstraction.
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await getClient().answerCallbackQuery(callbackQueryId, text !== undefined ? { text } : {});
}

export async function registerWebhook(url: string): Promise<void> {
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    throw new ExternalServiceError("TELEGRAM_WEBHOOK_SECRET is not configured.");
  }
  await getClient().setWebHook(url, { secret_token: env.TELEGRAM_WEBHOOK_SECRET });
}

// Telegram's webhook verification model (unlike Razorpay's HMAC signature):
// the secret_token passed to setWebHook is echoed back verbatim on every
// delivery in the X-Telegram-Bot-Api-Secret-Token header — verification is
// a direct comparison against the value this server itself registered.
export function verifyWebhookSecret(headerValue: string | undefined): boolean {
  if (!env.TELEGRAM_WEBHOOK_SECRET || !headerValue) {
    return false;
  }
  const expected = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET);
  const actual = Buffer.from(headerValue);
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
