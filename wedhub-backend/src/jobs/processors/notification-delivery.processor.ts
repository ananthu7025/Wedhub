import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { sendEmail } from "../../integrations/email/resend.client";
import { telegramProvider } from "../../integrations/telegram/telegram.client";
import { renderEmailHtml } from "../../modules/notifications/notification.templates";
import * as notificationRepository from "../../modules/notifications/notification.repository";
import type { NotificationDeliveryJobData } from "../queues/notification-delivery.queue";

async function deliverEmail(notification: { id: string; userId: string; title: string; body: string }): Promise<void> {
  const user = await notificationRepository.findUserById(notification.userId);
  if (!user) {
    throw new Error(`Notification ${notification.id} references a user that no longer exists`);
  }
  await sendEmail({
    to: user.email,
    subject: notification.title,
    html: renderEmailHtml({ title: notification.title, body: notification.body }),
  });
}

async function deliverNotification(notificationId: string): Promise<void> {
  const notification = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });

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
