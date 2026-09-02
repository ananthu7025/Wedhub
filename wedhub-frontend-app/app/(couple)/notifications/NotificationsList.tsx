"use client";

import { useState } from "react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/api/account-client";
import type { NotificationItem } from "@/lib/api/account.types";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function NotificationsList({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await markAllNotificationsRead();
  }

  async function handleRowClick(notification: NotificationItem) {
    if (notification.readAt !== null) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    await markNotificationRead(notification.id);
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-text-grey">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold hover:bg-surface-input"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="text-[15px] font-bold">No notifications yet</h3>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white">
          {notifications.map((notification, index) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleRowClick(notification)}
              className={`flex w-full gap-3.5 border-b border-neutral-grey-20 p-4 text-left last:border-b-0 ${
                notification.readAt === null ? "bg-[#fff9fa]" : "bg-transparent"
              } ${index === 0 ? "rounded-t-xl" : ""} ${index === notifications.length - 1 ? "rounded-b-xl" : ""}`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[13px] font-bold">{notification.title}</p>
                <p className="text-[13px] leading-snug text-text-grey">{notification.body}</p>
                <p className="mt-1.5 text-[11px] text-paynes-grey-30">{formatRelativeTime(notification.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
