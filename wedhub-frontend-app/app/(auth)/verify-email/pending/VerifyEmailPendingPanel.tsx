"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout, resendVerificationEmail } from "@/lib/api/auth-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";

const RESEND_COOLDOWN_SECONDS = 30;

// No "I've verified — continue" button here anymore: clicking the emailed
// link now verifies AND redirects to the dashboard on its own (see
// ../VerifyEmailStatus.tsx), so this panel only needs to stay open while the
// user waits for that link, with a way to resend it or back out.
export function VerifyEmailPendingPanel({ email }: { email: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function handleResend() {
    setPending(true);
    const result = await resendVerificationEmail();
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    showToast(`Verification email sent to ${email}.`, "success");
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

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleResend}
        disabled={pending || cooldown > 0}
        className="mb-3 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white disabled:opacity-60"
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
