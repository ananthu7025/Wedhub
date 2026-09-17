import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type { ConversationListItem, Message } from "./messaging.types";

/**
 * Server-only, authenticated reads for the in-app inbox (item 7). Role-
 * agnostic — the backend resolves whether the caller is the couple or the
 * vendor-owner side of each conversation from the session itself, so these
 * same functions back both (couple)/inbox and (vendor)/vendor/inbox.
 */

export function listMyConversations(page = 1, limit = 20) {
  return apiFetch<ConversationListItem[], PaginationMeta>("/messaging/conversations", {
    query: { page, limit },
  });
}

export function listConversationMessages(conversationId: string, page = 1, limit = 30) {
  return apiFetch<Message[], PaginationMeta>(`/messaging/conversations/${conversationId}/messages`, {
    query: { page, limit },
  });
}

export function getMyUnreadMessageCount() {
  return apiFetch<{ count: number }>("/messaging/unread-count");
}
