import type { Prisma, TelegramConversationState, TelegramFlowType, TelegramMessageDirection } from "@prisma/client";
import { prisma } from "../../config/database";

export function findTelegramUserByTelegramId(telegramUserId: bigint) {
  return prisma.telegramUser.findUnique({ where: { telegramUserId } });
}

export function upsertTelegramUser(data: {
  telegramUserId: bigint;
  chatId: bigint;
  username: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  languageCode: string | undefined;
}) {
  const optional = {
    username: data.username ?? null,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    languageCode: data.languageCode ?? null,
  };
  return prisma.telegramUser.upsert({
    where: { telegramUserId: data.telegramUserId },
    update: { chatId: data.chatId, ...optional },
    create: { telegramUserId: data.telegramUserId, chatId: data.chatId, ...optional },
  });
}

export function linkTelegramUserToUser(telegramUserRowId: string, userId: string) {
  return prisma.telegramUser.update({ where: { id: telegramUserRowId }, data: { userId } });
}

// One open (non-COMPLETED) conversation per Telegram user at a time — the
// state machine always resumes or restarts the same row rather than
// stacking parallel conversations.
export function findOpenConversation(telegramUserRowId: string) {
  return prisma.telegramConversation.findFirst({
    where: { telegramUserId: telegramUserRowId, state: { not: "COMPLETED" } },
    orderBy: { createdAt: "desc" },
  });
}

export function createConversation(telegramUserRowId: string) {
  return prisma.telegramConversation.create({ data: { telegramUserId: telegramUserRowId } });
}

// /start always resets to a single, current conversation rather than
// stacking a new row alongside a stale open one — a real bug caught live:
// the original implementation always called createConversation() from
// startConversation(), so calling /start twice (or /start after
// getOrCreateOpenConversation had already made a row) left two orphaned
// TelegramConversation rows both stuck at START for the same user, with no
// way to tell which one was "current."
export async function resetOrCreateConversation(telegramUserRowId: string) {
  const existing = await findOpenConversation(telegramUserRowId);
  if (existing) {
    // Also resets flowType/weddingWebsiteId back to their ENQUIRY-flow
    // defaults (Arch Phase 26) — without this, a user who abandoned a
    // WEDDING_WEBSITE flow mid-way and later types /start intending to
    // search for a vendor would have advanceConversation still routed
    // through the WW_* switch branches, since flowType would otherwise
    // stay stale from the earlier attempt.
    return prisma.telegramConversation.update({
      where: { id: existing.id },
      data: { state: "START", collectedData: {}, enquiryId: null, flowType: "ENQUIRY", weddingWebsiteId: null },
    });
  }
  return createConversation(telegramUserRowId);
}

export function updateConversation(
  id: string,
  data: {
    state?: TelegramConversationState;
    collectedData?: Prisma.InputJsonValue;
    enquiryId?: string;
    flowType?: TelegramFlowType;
    weddingWebsiteId?: string;
  },
) {
  return prisma.telegramConversation.update({ where: { id }, data });
}

// webhook.service.ts's payment_link.paid handler needs to push a
// "you're published!" message outside any normal conversation turn —
// this finds the (chatId, conversationId) pair to send it to. Includes
// COMPLETED conversations too (unlike findOpenConversation) since the
// flow may have already been left at WW_AWAITING_PAYMENT with no
// further messages sent by the user before paying.
export function findConversationByWeddingWebsiteId(weddingWebsiteId: string) {
  return prisma.telegramConversation.findFirst({
    where: { weddingWebsiteId },
    orderBy: { createdAt: "desc" },
    include: { telegramUser: true },
  });
}

export function recordMessage(data: {
  telegramUserRowId: string;
  conversationId: string | undefined;
  direction: TelegramMessageDirection;
  telegramMessageId: bigint | undefined;
  text: string | undefined;
}) {
  return prisma.telegramMessage.create({
    data: {
      telegramUserId: data.telegramUserRowId,
      conversationId: data.conversationId ?? null,
      direction: data.direction,
      telegramMessageId: data.telegramMessageId ?? null,
      text: data.text ?? null,
    },
  });
}

// product.md §36 idempotency: INSERT-then-catch on the unique update_id,
// same pattern as Arch Phase 11's WebhookEvent for Razorpay — a duplicate
// delivery's INSERT fails, caught by the caller and treated as
// "already handled."
export function recordProcessedUpdate(updateId: bigint) {
  return prisma.telegramProcessedUpdate.create({ data: { updateId } });
}

// A real bug caught live: if processing this update fails after the row
// above was written, a genuine Telegram retry of the SAME update_id would
// otherwise be wrongly deduped as "already handled" — silently dropping a
// message that was never actually delivered. Deleting the row on failure
// (before re-throwing, see telegram.webhook.service.ts) lets a real retry
// be treated as a fresh attempt, while a duplicate that arrives during or
// after a SUCCESSFUL attempt still correctly dedupes via the unique
// constraint.
export function deleteProcessedUpdate(updateId: bigint) {
  return prisma.telegramProcessedUpdate.deleteMany({ where: { updateId } });
}
