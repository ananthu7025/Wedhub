"use client";

import type { ApiResponse } from "./types";
import type {
  CreatePublishOrderResult,
  CreateWeddingWebsiteBody,
  CreateWeddingWebsiteEventBody,
  GeneratePreviewResult,
  SubmitRsvpBody,
  UpdateWeddingWebsiteBody,
  UpdateWeddingWebsiteEventBody,
  WeddingWebsiteDraft,
  WeddingWebsiteEvent,
  WeddingWebsiteRsvp,
} from "./wedding-website.types";

/**
 * Client-side calls through the generic authenticated proxy for the
 * wedding-website creation wizard and dashboard's interactive pieces
 * (Frontend Arch Phase 12).
 */

async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function createWeddingWebsite(body: CreateWeddingWebsiteBody) {
  return call<WeddingWebsiteDraft>("/wedding-websites/me", "POST", body);
}

export function getWeddingWebsiteDraft(id: string) {
  return call<WeddingWebsiteDraft>(`/wedding-websites/me/${id}`, "GET");
}

export function updateWeddingWebsite(id: string, body: UpdateWeddingWebsiteBody) {
  return call<WeddingWebsiteDraft>(`/wedding-websites/me/${id}`, "PATCH", body);
}

export function generateWeddingWebsitePreview(id: string) {
  return call<GeneratePreviewResult>(`/wedding-websites/me/${id}/preview`, "POST");
}

export function createWeddingWebsitePublishOrder(id: string) {
  return call<CreatePublishOrderResult>(`/wedding-websites/me/${id}/publish-order`, "POST");
}

export function createWeddingWebsiteEvent(id: string, body: CreateWeddingWebsiteEventBody) {
  return call<WeddingWebsiteEvent>(`/wedding-websites/me/${id}/events`, "POST", body);
}

export function updateWeddingWebsiteEvent(eventId: string, body: UpdateWeddingWebsiteEventBody) {
  return call<WeddingWebsiteEvent>(`/wedding-websites/me/events/${eventId}`, "PATCH", body);
}

export function deleteWeddingWebsiteEvent(eventId: string) {
  return call<{ deleted: true }>(`/wedding-websites/me/events/${eventId}`, "DELETE");
}

export function listWeddingWebsiteRsvps(id: string) {
  return call<WeddingWebsiteRsvp[]>(`/wedding-websites/me/${id}/rsvps`, "GET");
}

export function submitWeddingWebsiteRsvp(slug: string, body: SubmitRsvpBody) {
  return call<WeddingWebsiteRsvp>(`/wedding-websites/published/${slug}/rsvp`, "POST", body);
}
