import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { whatsAppProvider } from "../../integrations/whatsapp/whatsapp.client";
import { getWhatsAppTemplateForEvent } from "../../integrations/whatsapp/whatsapp-templates";
import * as notificationRepository from "../../modules/notifications/notification.repository";
import type { WhatsAppDeliveryJobData } from "../queues/whatsapp-delivery.queue";

// kind: "notification" — mirrors TELEGRAM's branch in
// notification-delivery.processor.ts's deliverNotification(): look up the
// recipient's User row, no-op as SENT if they have no phone number (nothing
// to deliver to, not an error — same reasoning as "no linked TelegramUser").
async function deliverForNotification(notificationId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) {
    // Notification.userId is onDelete: Cascade — legitimately gone if the
    // user was deleted in the meantime. Nothing to deliver; not an error.
    logger.info({ notificationId }, "Notification no longer exists — skipping WhatsApp delivery");
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: notification.userId }, select: { phone: true } });
  if (!user?.phone) {
    logger.info(
      { notificationId, userId: notification.userId },
      "Recipient has no phone number — skipping WhatsApp delivery",
    );
    await notificationRepository.markSent(notification.id);
    return;
  }

  const template = getWhatsAppTemplateForEvent(notification.eventType);
  if (!template) {
    // No approved WhatsApp template exists yet for this event type (see
    // whatsapp-templates.ts) — this is a configuration gap, not a
    // per-recipient condition, so it's worth surfacing as a real failure
    // (visible via Notification.lastError / the dead-letter path) rather
    // than silently no-op'ing as SENT, which would hide a missing template
    // from whoever is trying to turn WHATSAPP on as a default channel.
    throw new Error(`No WhatsApp template configured for event type ${notification.eventType}`);
  }

  await whatsAppProvider.sendTemplateMessage({
    to: user.phone,
    templateName: template.templateName,
    languageCode: template.languageCode,
    // Template params are positional; body/title aren't used here because a
    // WhatsApp template's variables must match what was actually approved,
    // not arbitrary rendered text — see whatsapp-templates.ts's own comment.
    params: [],
  });
  await notificationRepository.markSent(notification.id);
}

// kind: "direct" — no User/Notification row at all. Everything the provider
// needs travels in the job payload itself; only a WhatsAppDirectSend row is
// touched, for the same crash-safe PENDING-before-enqueue / dead-letter
// visibility Notification already gives the other case (see
// PLAN-2026-09-30-whatsapp-notification-channel.md §4c).
async function deliverDirect(payload: Extract<WhatsAppDeliveryJobData, { kind: "direct" }>): Promise<void> {
  const record = await prisma.whatsAppDirectSend.findUnique({ where: { id: payload.directSendId } });
  if (!record) {
    logger.info({ directSendId: payload.directSendId }, "WhatsAppDirectSend row no longer exists — skipping");
    return;
  }

  await whatsAppProvider.sendTemplateMessage({
    to: payload.to,
    templateName: payload.templateName,
    languageCode: payload.languageCode,
    params: payload.params,
  });

  await prisma.whatsAppDirectSend.updateMany({
    where: { id: payload.directSendId },
    data: { status: "SENT", sentAt: new Date() },
  });
}

async function deliverWhatsApp(data: WhatsAppDeliveryJobData): Promise<void> {
  if (data.kind === "notification") {
    await deliverForNotification(data.notificationId);
    return;
  }
  await deliverDirect(data);
}

export function startWhatsAppDeliveryWorker(): Worker<WhatsAppDeliveryJobData> {
  const worker = new Worker<WhatsAppDeliveryJobData>(
    "whatsapp-delivery",
    async (job: Job<WhatsAppDeliveryJobData>) => {
      try {
        await deliverWhatsApp(job.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (job.data.kind === "notification") {
          await notificationRepository.incrementAttempts(job.data.notificationId);
        } else {
          await prisma.whatsAppDirectSend.updateMany({
            where: { id: job.data.directSendId },
            data: { attempts: { increment: 1 } },
          });
        }
        logger.error({ err, jobData: job.data, attempt: job.attemptsMade + 1 }, "WhatsApp delivery attempt failed");
        throw new Error(message);
      }
    },
    {
      connection: createRedisConnection(),
      // I/O-bound (waiting on Meta's Graph API), not CPU-bound — see
      // PLAN-2026-09-30-whatsapp-notification-channel.md §6 for why this
      // needs to be meaningfully higher than notification-delivery's
      // (unconfigured, defaulting to 1) worker concurrency.
      concurrency: env.WHATSAPP_DELIVERY_CONCURRENCY,
      limiter: {
        max: env.WHATSAPP_RATE_LIMIT_MAX,
        duration: env.WHATSAPP_RATE_LIMIT_WINDOW_MS,
      },
    },
  );

  // Same dead-letter pattern as notification-delivery.processor.ts: only
  // write the terminal FAILED state once BullMQ's own retries (MAX_DELIVERY_ATTEMPTS)
  // are exhausted, and await the write so it's never lost to a race.
  worker.on("failed", (job, err) => {
    if (!job) return;
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!isFinalAttempt) {
      logger.warn({ jobId: job.id, attempt: job.attemptsMade, err }, "WhatsApp delivery attempt failed, will retry");
      return;
    }
    const markFailed =
      job.data.kind === "notification"
        ? notificationRepository.markFailed(job.data.notificationId, err.message)
        : prisma.whatsAppDirectSend.updateMany({
            where: { id: job.data.directSendId },
            data: { status: "FAILED", lastError: err.message },
          });
    return markFailed.then(() => {
      logger.error({ jobId: job.id, err }, "WhatsApp delivery job failed permanently (dead-lettered)");
    });
  });

  return worker;
}
