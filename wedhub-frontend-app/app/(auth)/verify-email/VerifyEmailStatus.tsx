"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/api/types";
import { formatApiError } from "@/lib/utils/error";
import { refreshSession } from "@/lib/api/auth-client";

type Status = "verifying" | "redirecting" | "error";

// Auto-verifies on mount (no manual "I'm verified" click needed) and, when
// this browser tab already holds the session that owns the link (the common
// case — the link is usually opened right where signup happened), also
// clears that session's stale emailVerified: false claim and sends the user
// straight into their dashboard. A stale claim exists because the access
// token is a JWT minted at login time (see token.util.ts's AccessTokenPayload)
// — verifying via this link doesn't retroactively rewrite an already-issued
// token, only refreshSession() (which re-reads emailVerifiedAt from the DB)
// does. If there's no session in this tab at all — link opened in a fresh
// tab/email client/different device than signup, confirmed (2026-09-22) to
// be the MORE common case in practice, not the exception — refreshSession()
// fails and this redirects to /login with the now-verified email pre-filled
// and a "verified, log in to continue" banner instead of a passive "you can
// log in now" dead end a user could easily miss or assume already worked.
export function VerifyEmailStatus({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await response.json()) as ApiResponse<{ verified: true; email: string }>;
      if (cancelled) return;

      if (!json.success) {
        setStatus("error");
        setErrorMessage(formatApiError(json.error));
        return;
      }

      const refreshResult = await refreshSession();
      if (cancelled) return;

      setStatus("redirecting");
      if (!refreshResult.success) {
        // No session in this browser/tab — the account is genuinely
        // verified (the POST above already succeeded), there's just nothing
        // here to refresh into a dashboard redirect.
        router.push(`/login?verifiedEmail=${encodeURIComponent(json.data.email)}`);
        return;
      }

      // /verify-email/pending re-checks the (now-fresh) session server-side
      // and redirects onward to the right role's dashboard — see that page's
      // own redirect(roleHomeRoute[...]) once session.emailVerified is true.
      router.push("/verify-email/pending");
      router.refresh();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (status === "verifying" || status === "redirecting") {
    return (
      <p className="text-center text-sm text-text-grey">
        {status === "verifying" ? "Verifying your email…" : "Verified — continuing…"}
      </p>
    );
  }

  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-red-70">{errorMessage || "This verification link is invalid or has expired."}</p>
      <p className="text-sm text-text-grey">
        <Link href="/login" className="font-semibold text-brand-primary no-underline">
          Log in
        </Link>{" "}
        to your account — your dashboard will show if verification is still needed.
      </p>
    </div>
  );
}
