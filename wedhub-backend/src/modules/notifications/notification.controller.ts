import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as notificationService from "./notification.service";
import type { ListNotificationsQuery, SetPreferenceBody } from "./notification.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function listMyNotifications(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const query = req.validatedQuery as ListNotificationsQuery;
  const [notifications, total] = await notificationService.listNotifications(userId, {
    unreadOnly: query.unreadOnly,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(notifications, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const count = await notificationService.getUnreadCount(userId);
  res.json(successResponse({ count }));
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await notificationService.markAsRead(userId, req.params.id as string);
  res.json(successResponse({ marked: true }));
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await notificationService.markAllAsRead(userId);
  res.json(successResponse({ marked: true }));
}

export async function listMyPreferences(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const preferences = await notificationService.listPreferences(userId);
  res.json(successResponse(preferences));
}

export async function setPreference(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as SetPreferenceBody;
  const preference = await notificationService.setPreference(userId, body);
  res.json(successResponse(preference));
}
