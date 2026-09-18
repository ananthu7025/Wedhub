"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ApiResponse } from "@/lib/api/types";
import { formatApiError } from "@/lib/utils/error";
import { emailSchema, validateField } from "@/lib/validation/auth-schemas";

export function ForgotPasswordForm() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const emailError = useMemo(() => validateField(emailSchema, email), [email]);
  const isFormValid = !emailError;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!isFormValid) return;

    setPending(true);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = (await response.json()) as ApiResponse<{ message: string }>;
    setPending(false);

    if (!json.success) {
      showToast(formatApiError(json.error), "error");
      return;
    }

    // The backend intentionally responds the same way whether or not the
    // email exists ("If an account exists...") to avoid leaking account
    // existence — so there is no "email not found" branch to show here.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-text-grey">
        If an account exists for <strong>{email}</strong>, a reset link has been sent.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <div className="mb-4.5">
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          invalid={touched && !!emailError}
        />
        {touched && <FieldError message={emailError} />}
      </div>
      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
