"use client";

import { useEffect, useRef } from "react";
import { refreshSession } from "@/lib/api/auth-client";

/**
 * Keeps the user's authenticated session alive during prolonged editing sessions
 * by periodically refreshing the short-lived access token (15 min TTL) before it expires.
 */
export function SessionKeeper() {
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    // Refresh token every 10 minutes
    const interval = setInterval(() => {
      refreshSession().catch(() => {});
      lastRefreshRef.current = Date.now();
    }, 10 * 60 * 1000);

    // Refresh when user returns to active tab if at least 8 minutes have elapsed
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastRefreshRef.current;
        if (elapsed > 8 * 60 * 1000) {
          refreshSession().catch(() => {});
          lastRefreshRef.current = Date.now();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
