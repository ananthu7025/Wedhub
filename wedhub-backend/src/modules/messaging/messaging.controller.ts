import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError, AuthorizationError } from "../../common/errors";
import * as messagingService from "./messaging.service";
import type { ListConversationsQuery, ListMessagesQuery, SendMessageBody, StartConversationBody } from "./messaging.schema";

function requireUser(req: Request): { id: string; role: "END_USER" | "VENDOR" | "ADMIN" } {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user;
}

export async function startConversation(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (user.role !== "END_USER") {
    // See messaging.routes.ts's comment on this route — only a couple can
    // start a new thread; a vendor only ever replies within one that
    // already exists.
    throw new AuthorizationError("Only couples can start a new conversation");
  }
  const body = req.body as StartConversationBody;
  const conversation = await messagingService.startConversation(user.id, body);
  res.status(201).json(successResponse(conversation));
}

export async function listMyConversations(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const query = req.validatedQuery as ListConversationsQuery;
  // Messaging is END_USER/VENDOR only — an ADMIN calling this has no
  // conversations of their own on either side, so there's nothing
  // meaningful to branch to; requireRole at the route level already keeps
  // ADMIN out entirely (see messaging.routes.ts).
  const { items, total } = await messagingService.listMyConversations(
    user.id,
    user.role as "END_USER" | "VENDOR",
    query.page,
    query.limit,
  );
  res.json(
    paginatedResponse(items, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }),
  );
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const query = req.validatedQuery as ListMessagesQuery;
  const [messages, total] = await messagingService.listMessages(
    req.params.id as string,
    user.id,
    query.page,
    query.limit,
  );
  res.json(
    paginatedResponse(messages, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }),
  );
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.body as SendMessageBody;
  const message = await messagingService.sendMessage(req.params.id as string, user.id, body.body, body.mediaId);
  res.status(201).json(successResponse(message));
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await messagingService.markRead(req.params.id as string, user.id);
  res.json(successResponse({ read: true }));
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const count = await messagingService.getUnreadCount(user.id, user.role as "END_USER" | "VENDOR");
  res.json(successResponse({ count }));
}
