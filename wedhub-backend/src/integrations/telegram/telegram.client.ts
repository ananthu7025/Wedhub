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

// This server's network path to api.telegram.org is both slow (~5-6s per
// TLS handshake, confirmed at the network level — see sendTypingIndicator's
// comment) and intermittently flaky: outbound calls occasionally fail
// outright with a low-level "fetch failed" (undici/TCP-level, not an HTTP
// error status) rather than just being slow. Without a retry, one such
// blip on sendMessage means the user's reply is silently dropped and the
// whole webhook update 500s — Telegram then marks the update failed and
// retries it later, but the user is left staring at nothing in the
// meantime. 3 attempts with a short fixed backoff is enough to ride out a
// single transient failure without piling on top of the already-slow
// happy path.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
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
    const message = await withRetry(() =>
      getClient().sendMessage(chatId, text, {
        ...(options?.buttons ? { reply_markup: toInlineKeyboard(options.buttons) } : {}),
      }),
    );
    return { messageId: String(message.message_id) };
  }

  async sendMedia(chatId: string, mediaUrl: string, caption: string | undefined): Promise<{ messageId: string }> {
    const message = await withRetry(() => getClient().sendPhoto(chatId, mediaUrl, caption !== undefined ? { caption } : {}));
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
  // Only 2 attempts, no delay between them — Telegram's callback-query ack
  // window is short (see telegram.webhook.service.ts's own comment on
  // this), so a 500ms retry delay risks the query going stale anyway. A
  // second immediate attempt still catches a one-off "fetch failed" that
  // a fixed network delay wouldn't.
  await withRetry(() => getClient().answerCallbackQuery(callbackQueryId, text !== undefined ? { text } : {}), 2, 0);
}

// Shows Telegram's native "Bot is typing..." indicator above the chat —
// fired immediately, before any slow work, so the user sees something
// happening instead of silence. Needed here specifically because this
// server's network path to api.telegram.org itself has a consistent
// ~5-6s TLS handshake delay (confirmed via raw openssl s_client, not a
// Node/undici issue — see the investigation that added this), on top of
// which every webhook update also does its own DB/business-logic work.
// Telegram auto-clears the indicator after ~5s or the bot's next message,
// whichever comes first, so no separate "stop typing" call exists/is
// needed. Fire-and-forget: this is pure UX, never worth failing the
// caller's real work over.
export async function sendTypingIndicator(chatId: string): Promise<void> {
  try {
    await getClient().sendChatAction(chatId, "typing");
  } catch {
    // Best-effort only — see comment above.
  }
}

// Arch Phase 26's WW_COLLECTING_PHOTOS state — resolves an inbound
// photo's file_id to Telegram's real download URL, then fetches the
// bytes ourselves (the bot server, not a browser, is the one pushing to
// R2 — see wedding-website-media.service.ts's ingestTelegramPhoto).
export async function downloadTelegramFile(fileId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const url = await withRetry(() => getClient().getFileLink(fileId));
  const response = await withRetry(() => fetch(url));
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
