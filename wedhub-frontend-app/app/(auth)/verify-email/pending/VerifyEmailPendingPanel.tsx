"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout, refreshSession, resendVerificationEmail } from "@/lib/api/auth-client";
import { formatApiError } from "@/lib/utils/error";

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyEmailPendingPanel({ email }: { email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setPending(true);
    setError(null);
    setSentMessage(null);
    const result = await resendVerificationEmail();
    setPending(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setSentMessage(`Verification email sent to ${email}.`);
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

  // No live "check if verified now" polling — see PLAN-2026-09-16's decision
  // to keep this link-driven: clicking the emailed link (verify-email/page.tsx)
  // is what actually verifies the account, via VerifyEmailStatus's POST to
  // /api/auth/verify-email. But this browser's *existing* session cookie was
  // minted at login time with emailVerified: false already baked into its
  // JWT claim (see token.util.ts's AccessTokenPayload) — verifying via the
  // emailed link, possibly in a different tab, does not retroactively
  // refresh that claim on its own. refreshSession() re-mints the access
  // token from the still-valid refresh token, and the backend's refresh()
  // re-reads emailVerifiedAt from the database at that moment (see
  // auth.service.ts) — so this is what actually clears the stale claim,
  // without asking for the password again. router.refresh() afterward
  // re-renders this Server Component page against the new cookie, which
  // redirects onward once verifySession sees emailVerified: true.
  async function handleCheckAgain() {
    setChecking(true);
    setError(null);
    const result = await refreshSession();
    setChecking(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    router.refresh();
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-4 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</p>}
      {sentMessage && (
        <p className="mb-4 rounded-md bg-emerald-10 p-2.5 text-[13px] text-emerald-70">{sentMessage}</p>
      )}

      <button
        type="button"
        onClick={handleCheckAgain}
        disabled={checking}
        className="mb-3 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white disabled:opacity-60"
      >
        {checking ? "Checking…" : "I've verified — continue"}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={pending || cooldown > 0}
        className="mb-3 block w-full rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
      >
        {pending ? "Sending…" : cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend verification email"}
      </button>

      <button
        type="button"
        onClick={handleLogout}
        className="block w-full rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input"
      >
        Log out
      </button>

      <p className="mt-5 text-xs text-text-grey">
        Entered the wrong email? Log out and sign up again, or update it from your account settings once you can sign
        in.
      </p>
    </div>
  );
}
