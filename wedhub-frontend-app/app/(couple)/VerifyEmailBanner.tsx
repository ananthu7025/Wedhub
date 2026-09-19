"use client";

import { useState } from "react";
import { resendVerificationEmail } from "@/lib/api/auth-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Persistent-shell banner shown on every (couple) page for a logged-in but
 * unverified END_USER — CoupleLayout only calls requireRole, not
 * requireVerifiedRole (see its own comment), so these pages are reachable
 * unverified; this banner is the nudge to fix that, without blocking
 * browsing. Reuses the same resendVerificationEmail()/useToast() wiring as
 * VerifyEmailPendingPanel.tsx rather than building a new one.
 *
 * Dismissible for the current page view only (plain client state, not
 * localStorage) — it reappears on next navigation/reload rather than being
 * silenced indefinitely, since the underlying account state hasn't changed.
 */
export function VerifyEmailBanner() {
  const { showToast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  if (dismissed) {
    return null;
  }

  async function handleResend() {
    setPending(true);
    const result = await resendVerificationEmail();
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    showToast("Verification email sent.", "success");
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900 sm:flex-row sm:gap-3"
    >
      <span className="font-medium">Verify your email to unlock all account features.</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={pending || cooldown > 0}
          className="font-bold underline underline-offset-2 hover:text-amber-950 disabled:opacity-60"
        >
          {pending ? "Sending…" : cooldown > 0 ? `Resend verification email (${cooldown}s)` : "Resend verification email"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-amber-700 hover:text-amber-950"
        >
          ×
        </button>
      </div>
    </div>
  );
}
