import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { Session, UserRole } from "./types";

/**
 * The real authorization enforcement point — see frontenddocs/03-stage-foundation.md
 * and the bundled Next.js authentication guide ("Proxy... should not be your
 * only line of defense"). proxy.ts does a cheap optimistic redirect; every
 * private page/layout must also call this (or requireRole below) directly.
 * Memoized per-request via React's cache() so multiple calls in one render
 * pass don't re-decode the cookie repeatedly.
 */
export const verifySession = cache(async (): Promise<Session> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const requireRole = cache(async (...roles: UserRole[]): Promise<Session> => {
  const session = await verifySession();
  if (!roles.includes(session.role)) {
    redirect("/login");
  }
  return session;
});

/** Non-redirecting variant for optional/public-but-personalized pages (e.g. home shows a different CTA if logged in). */
export const getOptionalSession = cache(async (): Promise<Session | null> => {
  return getSession();
});
