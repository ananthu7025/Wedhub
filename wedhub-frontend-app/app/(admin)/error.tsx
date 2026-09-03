"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary for every /admin/* page (added 2026-09-03, alongside
 * wiring real RBAC enforcement into authorize.middleware.ts — see
 * docs/bugs.md #2). Previously an admin page had no way to fail gracefully
 * at all: `requireAdmin()` only checks the JWT's role claim, so a user with
 * `role: ADMIN` but no real backend access (revoked, or in the future a
 * restricted non-"admin" AdminUser role) would sail past that check and
 * then crash with a generic "This page couldn't load" the moment the page's
 * own data fetch hit a real 403 from the backend. This is the first
 * error.tsx boundary in the app — none existed for any route group before.
 *
 * `error.message` is a best-effort heuristic, not a reliable channel:
 * Next.js only guarantees `message`/`digest` survive across the server/
 * client boundary for an error thrown during render, so ApiRequestError's
 * `.status`/`.code` fields (lib/api/types.ts) can't be trusted here — this
 * only checks whether the message text happens to look like our own
 * "You do not have permission..." string.
 */
export default function AdminError({ error }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const looksLikeAccessDenied = /permission|forbidden|403/i.test(error.message);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-6 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-10 text-2xl text-red-70">
        !
      </div>
      <h1 className="mb-2 text-xl font-bold">
        {looksLikeAccessDenied ? "You don't have access to this" : "Something went wrong"}
      </h1>
      <p className="mb-6 max-w-sm text-sm text-text-grey">
        {looksLikeAccessDenied
          ? "Your admin account doesn't have permission to view this page. Contact another admin if you believe this is a mistake."
          : "This admin page couldn't load. Try again, or contact support if this keeps happening."}
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark no-underline hover:bg-surface-input"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
