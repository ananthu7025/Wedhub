import type { NotificationChannel, NotificationEventType, Prisma } from "@prisma/client";
import { logger } from "../../config/logger";
import { enqueueNotificationDelivery } from "../../jobs/queues/notification-delivery.queue";
import { DEFAULT_CHANNELS } from "./notification.constants";
import * as notificationRepository from "./notification.repository";
import { renderNotification, type TemplateData } from "./notification.templates";

export interface NotifyInput {
  userId: string;
  eventType: NotificationEventType;
  data?: TemplateData;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

async function resolveChannels(userId: string, eventType: NotificationEventType): Promise<NotificationChannel[]> {
  const defaults = DEFAULT_CHANNELS[eventType];
  const overrides = await notificationRepository.findPreferences(userId, eventType);
  if (overrides.length === 0) {
    return defaults;
  }
  const overrideMap = new Map(overrides.map((pref) => [pref.channel, pref.isEnabled]));
  return defaults.filter((channel) => overrideMap.get(channel) ?? true);
}

// The single entry point every module calls to notify a user of an event.
// Coding Rule 7: this function only writes Notification rows (PENDING) and
// enqueues delivery jobs — it never sends an email/Telegram message inline,
// so a caller's own transaction (e.g. approving a vendor) can never fail
// because a notification provider was down. Never throws — a notification
// failure must not fail the core action it was triggered from (this stage's
// own acceptance criterion).
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const channels = await resolveChannels(input.userId, input.eventType);
    if (channels.length === 0) {
      return;
    }

    await Promise.all(
      channels.map(async (channel) => {
        // Rendered per-channel, not once and reused: VERIFICATION/
        // PASSWORD_RESET/EMAIL_CHANGE_CONFIRMATION return a token-free body
        // for anything other than EMAIL (see notification.templates.ts) —
        // reusing one EMAIL-shaped render across every channel is exactly
        // how a raw verification/reset token used to end up sitting in an
        // IN_APP row, readable back via GET /notifications.
        const content = renderNotification(input.eventType, input.data ?? {}, channel);
        // Same reasoning applies to the persisted `data` JSON column: for a
        // non-EMAIL channel, strip `token` so it never lands in the DB row
        // either, even if a future template stops needing it in body text.
        const persistedData =
          channel !== "EMAIL" && input.data && "token" in input.data
            ? Object.fromEntries(Object.entries(input.data).filter(([key]) => key !== "token"))
            : input.data;

        const notification = await notificationRepository.createNotification({
          userId: input.userId,
          eventType: input.eventType,
          channel,
          title: content.title,
          body: content.body,
          data: persistedData as Prisma.InputJsonValue | undefined,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        });
        // IN_APP has no external delivery step — the row itself, once
        // written, IS the delivered notification (it's what listNotifications
        // reads). Only EMAIL/TELEGRAM need an actual delivery job.
        if (channel === "IN_APP") {
          await notificationRepository.markSent(notification.id);
          return;
        }
        await enqueueNotificationDelivery(notification.id);
      }),
    );
  } catch (err) {
    logger.error({ err, userId: input.userId, eventType: input.eventType }, "Failed to queue notification (core action unaffected)");
  }
}

export function listNotifications(userId: string, filter: { unreadOnly: boolean; page: number; limit: number }) {
  return Promise.all([
    notificationRepository.listForUser(userId, filter),
    notificationRepository.countForUser(userId, filter),
  ]);
}

export function getUnreadCount(userId: string) {
  return notificationRepository.countUnread(userId);
}

export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  await notificationRepository.markRead(notificationId, userId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  await notificationRepository.markAllRead(userId);
}

export async function setPreference(
  userId: string,
  input: { eventType: NotificationEventType; channel: NotificationChannel; isEnabled: boolean },
) {
  return notificationRepository.upsertPreference({ userId, ...input });
}

export function listPreferences(userId: string) {
  return notificationRepository.listPreferencesForUser(userId);
}
