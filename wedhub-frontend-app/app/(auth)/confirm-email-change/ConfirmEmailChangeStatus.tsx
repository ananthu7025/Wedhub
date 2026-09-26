"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { confirmEmailChange } from "@/lib/api/auth-client";
import { formatApiError } from "@/lib/utils/error";
import { CheckIcon } from "@/components/portfolio/icons";

type Status = "confirming" | "success" | "error";

// Mirrors verify-email/VerifyEmailStatus.tsx's shape. Distinct endpoint
// (POST /auth/confirm-email-change, not /auth/verify-email) since this
// moves User.email to the new address and re-stamps emailVerifiedAt in one
// step — see wedhub-backend's auth.service.ts::confirmEmailChange().
export function ConfirmEmailChangeStatus({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("confirming");
  const [errorMessage, setErrorMessage] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await confirmEmailChange(token);
      if (cancelled) return;

      if (result.success) {
        setStatus("success");
        setNewEmail(result.data.email);
      } else {
        setStatus("error");
        setErrorMessage(formatApiError(result.error));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "confirming") {
    return <p className="text-center text-sm text-text-grey">Confirming your new email…</p>;
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-10 text-emerald-70">
          <CheckIcon className="h-6 w-6" />
        </div>
        <p className="mb-6 text-sm text-text-grey">
          Your account email is now <span className="font-semibold text-text-dark">{newEmail}</span>. Log in with
          your new email to continue.
        </p>
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
      <p className="mb-2 text-sm text-red-70">{errorMessage || "This confirmation link is invalid or has expired."}</p>
      <p className="text-sm text-text-grey">
        <Link href="/login" className="font-semibold text-brand-primary no-underline">
          Log in
        </Link>{" "}
        and try changing your email again from your account settings.
      </p>
    </div>
  );
}
