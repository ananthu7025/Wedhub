"use client";

import type { ApiResponse, PaginationMeta } from "./types";
import type { Conversation, Message, StartConversationBody } from "./messaging.types";

async function call<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

// Couple-only (see wedhub-backend's messaging.controller.ts::startConversation)
// — used by a vendor profile page's "Message" button or a lead detail view.
export function startConversation(body: StartConversationBody) {
  return call<Conversation>("/messaging/conversations", "POST", body);
}

export function sendMessage(conversationId: string, body: string, mediaId?: string) {
  return call<Message>(`/messaging/conversations/${conversationId}/messages`, "POST", { body, mediaId });
}

export function markConversationRead(conversationId: string) {
  return call<{ read: true }>(`/messaging/conversations/${conversationId}/read`, "POST");
}

// Client-side counterpart to lib/api/messaging.ts's listConversationMessages
// (that one is server-only — imports next/headers via client.ts — so
// InboxView.tsx, a Client Component, must use this instead when a viewer
// selects a conversation after the page's initial server render).
export async function listConversationMessagesClient(
  conversationId: string,
  page = 1,
  limit = 30,
): Promise<ApiResponse<Message[], PaginationMeta>> {
  const response = await fetch(
    `/api/messaging/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    { credentials: "include" },
  );
  return (await response.json()) as ApiResponse<Message[], PaginationMeta>;
}
