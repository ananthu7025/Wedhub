"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/lib/api/types";
import { formatApiError } from "@/lib/utils/error";
import { refreshSession } from "@/lib/api/auth-client";

type Status = "verifying" | "success" | "redirecting" | "no-session" | "error";

// Auto-verifies on mount (no manual "I'm verified" click needed) and, when
// this browser tab already holds the session that owns the link (the common
// case — the link is usually opened right where signup happened), also
// clears that session's stale emailVerified: false claim and sends the user
// straight into their dashboard. A stale claim exists because the access
// token is a JWT minted at login time (see token.util.ts's AccessTokenPayload)
// — verifying via this link doesn't retroactively rewrite an already-issued
// token, only refreshSession() (which re-reads emailVerifiedAt from the DB)
// does. If there's no session in this tab at all — link opened in a fresh
// tab/email client, the other common case — refreshSession() fails and we
// fall back to a plain "verified, please log in" screen instead of erroring.
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
      const json = (await response.json()) as ApiResponse<{ verified: true }>;
      if (cancelled) return;

      if (!json.success) {
        setStatus("error");
        setErrorMessage(formatApiError(json.error));
        return;
      }

      const refreshResult = await refreshSession();
      if (cancelled) return;

      if (!refreshResult.success) {
        setStatus("no-session");
        return;
      }

      setStatus("redirecting");
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
        {status === "verifying" ? "Verifying your email…" : "Verified — taking you to your dashboard…"}
      </p>
    );
  }

  if (status === "success" || status === "no-session") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-10 text-emerald-70">
          ✓
        </div>
        <p className="mb-6 text-sm text-text-grey">Your email is verified. You can log in now.</p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white no-underline"
        >
          Go to login
        </Link>
      </div>
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
