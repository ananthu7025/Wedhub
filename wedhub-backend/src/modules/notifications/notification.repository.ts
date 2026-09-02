import type { NotificationChannel, NotificationEventType, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
}

export function findPreferences(userId: string, eventType: NotificationEventType) {
  return prisma.notificationPreference.findMany({ where: { userId, eventType } });
}

export function createNotification(data: {
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Prisma.InputJsonValue | undefined;
  relatedEntityType: string | undefined;
  relatedEntityId: string | undefined;
}) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      eventType: data.eventType,
      channel: data.channel,
      title: data.title,
      body: data.body,
      ...(data.data !== undefined ? { data: data.data } : {}),
      ...(data.relatedEntityType !== undefined ? { relatedEntityType: data.relatedEntityType } : {}),
      ...(data.relatedEntityId !== undefined ? { relatedEntityId: data.relatedEntityId } : {}),
    },
  });
}

export function findNotificationById(id: string) {
  return prisma.notification.findUnique({ where: { id } });
}

// updateMany (not update) throughout this trio — a Notification can be
// legitimately gone by the time a queued delivery job runs (Notification.userId
// is onDelete: Cascade, so deleting a user, e.g. test-account cleanup,
// deletes their pending notifications too). update() throws P2025 in that
// race and crashes the worker; updateMany() silently matches zero rows,
// same pattern markRead() below already used correctly.
export function markSent(id: string) {
  return prisma.notification.updateMany({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
}

// Attempts is bumped separately, once per delivery attempt, by
// incrementAttempts (called from the processor's catch block on every
// failure, retried or not) — this only records the terminal state once
// BullMQ's own retries are exhausted, so it must not increment again itself.
export function markFailed(id: string, error: string) {
  return prisma.notification.updateMany({
    where: { id },
    data: { status: "FAILED", lastError: error },
  });
}

export function incrementAttempts(id: string) {
  return prisma.notification.updateMany({ where: { id }, data: { attempts: { increment: 1 } } });
}

export function markRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { status: "READ", readAt: new Date() } });
}

export function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { status: "READ", readAt: new Date() },
  });
}

export function listForUser(userId: string, filter: { unreadOnly: boolean; page: number; limit: number }) {
  const where: Prisma.NotificationWhereInput = { userId, channel: "IN_APP" };
  if (filter.unreadOnly) {
    where.readAt = null;
  }
  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countForUser(userId: string, filter: { unreadOnly: boolean }) {
  const where: Prisma.NotificationWhereInput = { userId, channel: "IN_APP" };
  if (filter.unreadOnly) {
    where.readAt = null;
  }
  return prisma.notification.count({ where });
}

export function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, channel: "IN_APP", readAt: null } });
}

export function upsertPreference(data: {
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  isEnabled: boolean;
}) {
  return prisma.notificationPreference.upsert({
    where: { userId_eventType_channel: { userId: data.userId, eventType: data.eventType, channel: data.channel } },
    update: { isEnabled: data.isEnabled },
    create: data,
  });
}

export function listPreferencesForUser(userId: string) {
  return prisma.notificationPreference.findMany({ where: { userId } });
}
