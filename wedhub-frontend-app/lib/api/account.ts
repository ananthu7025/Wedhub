import { apiFetch } from "./client";
import type { PaginationMeta } from "./types";
import type { MeResponse, MyEnquiry, MyReview, NotificationItem } from "./account.types";

/**
 * Server-only, authenticated reads for the couple account surface
 * (Frontend Arch Phase 4). See lib/api/account.types.ts's header comment.
 */

export function getMe() {
  return apiFetch<MeResponse>("/users/me");
}

export function listMyEnquiries(page = 1, limit = 20) {
  return apiFetch<MyEnquiry[], PaginationMeta>("/enquiries/mine", { query: { page, limit } });
}

export function listMyReviews(page = 1, limit = 20) {
  return apiFetch<MyReview[], PaginationMeta>("/reviews/mine", { query: { page, limit } });
}

export function listMyNotifications(unreadOnly = false, page = 1, limit = 20) {
  return apiFetch<NotificationItem[], PaginationMeta>("/notifications/me", {
    query: { unreadOnly, page, limit },
  });
}

// Notifications are a generic, role-agnostic system (see
// lib/api/notification-preferences.types.ts's header comment) — used by
// both the couple and vendor shells for the header bell's unread badge.
export function getMyUnreadNotificationCount() {
  return apiFetch<{ count: number }>("/notifications/me/unread-count");
}
