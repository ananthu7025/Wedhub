import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { sendEmail } from "../../integrations/email/resend.client";
import { telegramProvider } from "../../integrations/telegram/telegram.client";
import { renderEmailHtml, renderNotification, type TemplateData } from "../../modules/notifications/notification.templates";
import * as notificationRepository from "../../modules/notifications/notification.repository";
import type { NotificationDeliveryJobData } from "../queues/notification-delivery.queue";
import type { NotificationEventType } from "@prisma/client";

async function deliverEmail(notification: {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  data: unknown;
}): Promise<void> {
  // Almost every event delivers to the account's own (current) email via
  // user.email. The one exception: a pending email-change confirmation
  // (auth.service.ts's changeEmail()) must reach the NEW, not-yet-confirmed
  // address instead — that's exactly the address ownership is being proven
  // for, and it may differ from user.email for as long as the change is
  // pending. That override rides in the same Notification.data JSON blob
  // every other event's template data already uses (see notify()'s
  // `data: input.data` passthrough) rather than adding a dedicated column,
  // since this is a one-field, one-caller exception, not a new concept.
  const overrideEmail =
    typeof notification.data === "object" && notification.data !== null && "overrideEmail" in notification.data
      ? (notification.data as { overrideEmail?: unknown }).overrideEmail
      : undefined;

  let to: string;
  if (typeof overrideEmail === "string" && overrideEmail.length > 0) {
    to = overrideEmail;
  } else {
    const user = await notificationRepository.findUserById(notification.userId);
    if (!user) {
      throw new Error(`Notification ${notification.id} references a user that no longer exists`);
    }
    to = user.email;
  }

  // Re-render (rather than trust the persisted title/body alone) so the CTA
  // button can be reconstructed: notify() only persists {title, body} on the
  // Notification row (never the template's `cta`, since for
  // VERIFICATION/PASSWORD_RESET/EMAIL_CHANGE_CONFIRMATION that URL embeds the
  // same raw token the EMAIL row's `data` column already carries — see
  // notify()'s per-channel token-stripping comment). Re-rendering here is
  // deterministic (same eventType + data + "EMAIL" channel notify() used) and
  // touches nothing not already sitting in this row.
  const content = renderNotification(
    notification.eventType,
    (notification.data as TemplateData | null) ?? {},
    "EMAIL",
  );

  await sendEmail({
    to,
    subject: notification.title,
    html: renderEmailHtml(content),
  });
}

async function deliverNotification(notificationId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) {
    // Notification.userId is onDelete: Cascade — the row can legitimately
    // be gone by the time this job runs if the user was deleted in the
    // meantime (e.g. account deletion, test-account cleanup). Nothing to
    // delivery or mark; this is not an error.
    logger.info({ notificationId }, "Notification no longer exists — skipping delivery");
    return;
  }

  if (notification.channel === "EMAIL") {
    await deliverEmail(notification);
    await notificationRepository.markSent(notification.id);
    return;
  }

  if (notification.channel === "TELEGRAM") {
    // No channel currently defaults to TELEGRAM (see notification.constants
    // — Arch Phase 14 confirmed with the user that it stays off by default
    // until a real bot exists), so this only fires for a user who
    // explicitly opted in via preferences. That user may still have never
    // linked a Telegram identity at all — a genuine, expected case, not an
    // error: nothing to deliver to, so this no-ops as SENT rather than
    // retrying forever against a recipient that will never exist.
    const telegramUser = await prisma.telegramUser.findUnique({ where: { userId: notification.userId } });
    if (!telegramUser) {
      logger.info({ notificationId, userId: notification.userId }, "No linked Telegram identity — skipping Telegram delivery");
      await notificationRepository.markSent(notification.id);
      return;
    }
    await telegramProvider.sendMessage(String(telegramUser.chatId), `${notification.title}\n\n${notification.body}`);
    await notificationRepository.markSent(notification.id);
    return;
  }

  // IN_APP is delivered synchronously in notification.service and never
  // reaches this queue — a job for one here would be a real bug.
  throw new Error(`notification-delivery received an unexpected channel: ${notification.channel}`);
}

export function startNotificationDeliveryWorker(): Worker<NotificationDeliveryJobData> {
  const worker = new Worker<NotificationDeliveryJobData>(
    "notification-delivery",
    async (job: Job<NotificationDeliveryJobData>) => {
      const { notificationId } = job.data;
      try {
        await deliverNotification(notificationId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await notificationRepository.incrementAttempts(notificationId);
        logger.error({ err, notificationId, attempt: job.attemptsMade + 1 }, "Notification delivery attempt failed");
        throw new Error(message);
      }
    },
    { connection: createRedisConnection() },
  );

  // "failed" fires after EVERY failed attempt, not just the final one — a
  // real bug caught live: the first version called markFailed() (and
  // separately double-incremented attempts) on every retry, and a
  // fire-and-forget `void` call raced the job's own completion, so the
  // Notification row was observed still PENDING with lastError still null
  // even after all 3 attempts had genuinely been exhausted. Fixed by (1)
  // only writing the terminal FAILED state once attemptsMade has reached
  // the job's configured `attempts` (BullMQ retries below that), and
  // (2) awaiting the write so it can never be lost to a race.
  worker.on("failed", (job, err) => {
    if (!job) return;
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (isFinalAttempt) {
      return notificationRepository.markFailed(job.data.notificationId, err.message).then(() => {
        logger.error({ jobId: job.id, err }, "Notification delivery job failed permanently (dead-lettered)");
      });
    }
    logger.warn({ jobId: job.id, attempt: job.attemptsMade, err }, "Notification delivery attempt failed, will retry");
  });

  return worker;
}
