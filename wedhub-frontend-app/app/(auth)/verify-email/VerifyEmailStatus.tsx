"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/lib/api/types";
import { formatApiError } from "@/lib/utils/error";

type Status = "verifying" | "success" | "error";

export function VerifyEmailStatus({ token }: { token: string }) {
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

      if (json.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(formatApiError(json.error));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "verifying") {
    return <p className="text-center text-sm text-text-grey">Verifying your email…</p>;
  }

  if (status === "success") {
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
