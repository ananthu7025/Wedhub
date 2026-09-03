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
    inline_keyboard: buttons.map((row) =>
      row.map((btn): { text: string; url: string } | { text: string; callback_data: string } =>
        btn.url !== undefined ? { text: btn.text, url: btn.url } : { text: btn.text, callback_data: btn.callbackData as string },
      ),
    ),
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

// Arch Phase 26's WW_COLLECTING_PHOTOS state — resolves an inbound
// photo's file_id to Telegram's real download URL, then fetches the
// bytes ourselves (the bot server, not a browser, is the one pushing to
// R2 — see wedding-website-media.service.ts's ingestTelegramPhoto).
export async function downloadTelegramFile(fileId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const url = await getClient().getFileLink(fileId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new ExternalServiceError(`Failed to download Telegram file: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  // Telegram doesn't return a Content-Type header reliably for file
  // downloads — photos are always JPEG on Telegram's side regardless of
  // what the user originally sent (server-side re-encoding), so this is
  // not a guess.
  const mimeType = response.headers.get("content-type") ?? "image/jpeg";
  return { bytes, mimeType };
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
