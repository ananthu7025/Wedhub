import { logger } from "../../config/logger";
import { AuthenticationError, ValidationError } from "../../common/errors";
import { telegramProvider, answerCallbackQuery, sendTypingIndicator } from "../../integrations/telegram/telegram.client";
import { verifyWebhookSecret } from "../../integrations/telegram/telegram.client";
import type { InlineButton } from "../../integrations/telegram/messaging-provider";
import * as telegramRepository from "./telegram.repository";
import { advanceConversation, startConversation } from "./telegram.conversation.service";
import type { TelegramApiUser, TelegramMessage, TelegramCallbackQuery, TelegramUpdate } from "./telegram.api-types";

// Serializes processing per chat so a burst of messages from the same
// user is handled one at a time, in order, instead of racing each other
// against the same TelegramConversation row (concurrent requests would
// otherwise all read the same conversation.state and stomp on each
// other's updateConversation call — a real bug caught live: a user
// double/triple-tapping sent several webhook deliveries concurrently,
// which corrupted the conversation state and, since the queue didn't
// exist yet, occasionally threw out of an unawaited handler and crashed
// the process). Chats not currently processing anything are absent from
// the map — this stays small and self-cleans, never growing unbounded.
const chatQueues = new Map<number, Promise<void>>();

function runSerializedForChat(chatId: number, task: () => Promise<void>): Promise<void> {
  const previous = chatQueues.get(chatId) ?? Promise.resolve();
  const next = previous.then(task, task);
  chatQueues.set(chatId, next);
  next.finally(() => {
    if (chatQueues.get(chatId) === next) {
      chatQueues.delete(chatId);
    }
  });
  return next;
}

async function upsertTelegramUserFromApiUser(apiUser: TelegramApiUser, chatId: number) {
  return telegramRepository.upsertTelegramUser({
    telegramUserId: BigInt(apiUser.id),
    chatId: BigInt(chatId),
    username: apiUser.username,
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    languageCode: apiUser.language_code,
  });
}

function contactNameFor(apiUser: TelegramApiUser): string {
  return [apiUser.first_name, apiUser.last_name].filter(Boolean).join(" ") || apiUser.username || "itsmyKalyanam user";
}

async function getOrCreateOpenConversation(telegramUserRowId: string) {
  const existing = await telegramRepository.findOpenConversation(telegramUserRowId);
  if (existing) return existing;
  return telegramRepository.createConversation(telegramUserRowId);
}

async function sendAndLog(
  telegramUserRowId: string,
  chatId: bigint,
  conversationId: string | undefined,
  step: { text: string; buttons?: InlineButton[][] },
): Promise<void> {
  const sent = await telegramProvider.sendMessage(String(chatId), step.text, step.buttons ? { buttons: step.buttons } : {});
  await telegramRepository.recordMessage({
    telegramUserRowId,
    conversationId,
    direction: "OUTBOUND",
    telegramMessageId: BigInt(sent.messageId),
    text: step.text,
  });
}

async function handleTextMessage(message: TelegramMessage): Promise<void> {
  const apiUser = message.from;
  // Photos arrive with no message.text (only message.photo) — Arch Phase
  // 26's WW_COLLECTING_PHOTOS state needs those, so this can no longer
  // bail out on "!message.text" the way the ENQUIRY-only version did.
  if (!apiUser || (!message.text && !message.photo)) return;

  // Fire first, before any DB work — see sendTypingIndicator's own comment
  // for why this matters on this deployment specifically.
  void sendTypingIndicator(String(message.chat.id));

  const telegramUser = await upsertTelegramUserFromApiUser(apiUser, message.chat.id);
  await telegramRepository.recordMessage({
    telegramUserRowId: telegramUser.id,
    conversationId: undefined,
    direction: "INBOUND",
    telegramMessageId: BigInt(message.message_id),
    text: message.text ?? (message.photo ? "[photo]" : ""),
  });

  // /start (or any restart) always begins a fresh conversation — product.md
  // §35/architecture.md's "restart conversation" task. A stale in-progress
  // conversation from an earlier session is simply abandoned in place (its
  // row stays whatever state it was in — nothing to clean up, no partial
  // Enquiry/Lead was ever created for it since that only happens at
  // CONFIRMING_ENQUIRY).
  if (message.text?.trim() === "/start") {
    const step = await startConversation(telegramUser.id);
    await sendAndLog(telegramUser.id, telegramUser.chatId, undefined, step);
    return;
  }

  const conversation = await getOrCreateOpenConversation(telegramUser.id);
  const step = await advanceConversation(
    conversation,
    telegramUser.id,
    { text: message.text, callbackData: undefined, photo: message.photo },
    {
      userId: telegramUser.userId ?? undefined,
      contactName: contactNameFor(apiUser),
      contactPhone: undefined,
      telegramUserId: telegramUser.telegramUserId,
    },
  );
  await sendAndLog(telegramUser.id, telegramUser.chatId, conversation.id, step);
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
  const apiUser = callbackQuery.from;
  const chatId = callbackQuery.message?.chat.id;
  if (!chatId || !callbackQuery.data) return;

  void sendTypingIndicator(String(chatId));

  // Ack first, before any DB/business logic — Telegram's callback-query
  // TTL is short, and this handler can be slow behind a queued photo
  // upload (WW_COLLECTING_PHOTOS downloads from Telegram then pushes to
  // R2, fully synchronously, on the same single-instance process). A real
  // bug caught live: acking only after upserting the user/recording the
  // message let the query go stale under that kind of load, and since the
  // stale ack threw unguarded, the whole handler aborted — the
  // conversation never advanced and the user never got a reply, then
  // Telegram retried the same doomed update repeatedly. The ack failing
  // is expected/recoverable (the user only loses the loading-spinner
  // clear, not the actual conversation step), so it must never abort
  // everything after it.
  try {
    await answerCallbackQuery(callbackQuery.id);
  } catch (err) {
    logger.warn({ err, callbackQueryId: callbackQuery.id }, "Failed to acknowledge Telegram callback query (continuing anyway)");
  }

  const telegramUser = await upsertTelegramUserFromApiUser(apiUser, chatId);
  await telegramRepository.recordMessage({
    telegramUserRowId: telegramUser.id,
    conversationId: undefined,
    direction: "INBOUND",
    telegramMessageId: undefined,
    text: callbackQuery.data,
  });

  const conversation = await getOrCreateOpenConversation(telegramUser.id);
  const step = await advanceConversation(
    conversation,
    telegramUser.id,
    { text: undefined, callbackData: callbackQuery.data },
    {
      userId: telegramUser.userId ?? undefined,
      contactName: contactNameFor(apiUser),
      contactPhone: undefined,
      telegramUserId: telegramUser.telegramUserId,
    },
  );
  await sendAndLog(telegramUser.id, telegramUser.chatId, conversation.id, step);
}

// Called from webhook.service.ts's payment_link.paid handler (Razorpay
// webhook, not a Telegram update) — the only proactive, out-of-turn push
// this bot sends. Silently no-ops if no conversation row is found (e.g.
// the website was published through the web flow, not Telegram, and
// nothing to notify).
export async function notifyWeddingWebsitePublished(weddingWebsiteId: string, publishedUrl: string): Promise<void> {
  const conversation = await telegramRepository.findConversationByWeddingWebsiteId(weddingWebsiteId);
  if (!conversation) return;

  await telegramRepository.updateConversation(conversation.id, { state: "WW_PUBLISHED" });
  await sendAndLog(conversation.telegramUser.id, conversation.telegramUser.chatId, conversation.id, {
    text: "🎉 Payment received! Your wedding website is live.",
    buttons: [[{ text: "View Your Website", url: publishedUrl }]],
  });
}

async function processUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.message) {
      await handleTextMessage(update.message);
      return;
    }
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }
    logger.info({ updateId: update.update_id }, "Unhandled Telegram update type (logged, no action)");
  } catch (err) {
    // A real bug caught live: without this delete, a genuine Telegram retry
    // of this exact update_id would otherwise be wrongly deduped by the row
    // recorded in handleWebhook — silently losing a message that was never
    // actually delivered, rather than the intended "never reprocess a TRUE
    // duplicate." (Processing here is async/backgrounded — see
    // handleWebhook — so this can no longer rely on a non-2xx response to
    // make Telegram itself retry; the dedupe row is still cleaned up so a
    // future genuine redelivery, or a user simply resending, is treated as
    // a fresh attempt rather than silently dropped.)
    await telegramRepository.deleteProcessedUpdate(BigInt(update.update_id));
    logger.error({ err, updateId: update.update_id }, "Failed to process Telegram update");
  }
}

function chatIdForUpdate(update: TelegramUpdate): number | undefined {
  return update.message?.chat.id ?? update.callback_query?.message?.chat.id;
}

export async function handleWebhook(body: unknown, secretTokenHeader: string | undefined): Promise<void> {
  // Coding Rule 6: verified before anything else happens — an unverified
  // request is rejected outright, never parsed or acted on.
  if (!verifyWebhookSecret(secretTokenHeader)) {
    throw new AuthenticationError("Invalid Telegram webhook secret");
  }
  if (!body || typeof body !== "object") {
    throw new ValidationError("Missing request body");
  }

  const update = body as TelegramUpdate;

  // product.md §36: store processed update_ids, INSERT-then-catch on the
  // unique constraint — a genuine redelivery carries the same update_id and
  // is silently ignored here, never reprocessed into a duplicate message,
  // lead, or notification.
  try {
    await telegramRepository.recordProcessedUpdate(BigInt(update.update_id));
  } catch {
    logger.info({ updateId: update.update_id }, "Duplicate Telegram update ignored (idempotency)");
    return;
  }

  // Everything past this point (DB writes, conversation logic, outbound
  // Telegram sends) is intentionally NOT awaited before returning to the
  // controller. A real bug caught live: this server's path to
  // api.telegram.org has a consistent multi-second handshake delay (see
  // telegram.client.ts), so awaiting a reply here before responding 200
  // routinely blew past Telegram's own webhook timeout — Telegram then
  // re-delivered the same update while the first attempt was still
  // in flight, and with no per-chat serialization (see
  // runSerializedForChat below) those concurrent deliveries raced each
  // other against the same conversation row and could throw out of an
  // unawaited handler, crashing the process. Acking immediately here
  // means Telegram never sees a slow/failed response for a genuine
  // duplicate update, and processing is still serialized per chat so a
  // user firing off several messages before the first reply lands gets
  // them handled one at a time, in order, instead of concurrently.
  const chatId = chatIdForUpdate(update);
  const task = () => processUpdate(update);
  if (chatId === undefined) {
    void processUpdate(update);
  } else {
    void runSerializedForChat(chatId, task);
  }
}
