import { apiFetch } from "./client";
import type { NotificationPreference } from "./notification-preferences.types";

/** Server-only, authenticated read for notification preferences (Frontend Arch Phase 7). */
export function listMyNotificationPreferences() {
  return apiFetch<NotificationPreference[]>("/notifications/me/preferences");
}
