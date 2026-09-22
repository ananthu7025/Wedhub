"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ApiResponse } from "@/lib/api/types";
import { formatApiError } from "@/lib/utils/error";
import { passwordSchema, validateField } from "@/lib/validation/auth-schemas";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);

  const passwordError = useMemo(() => validateField(passwordSchema, password), [password]);
  const isFormValid = !passwordError;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!isFormValid) return;

    setPending(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = (await response.json()) as ApiResponse<{ passwordReset: true }>;

    if (!json.success) {
      showToast(formatApiError(json.error), "error");
      setPending(false);
      return;
    }

    showToast("Password reset. Please log in.", "success");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <div className="mb-4.5">
        <PasswordInput
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched(true)}
          invalid={touched && !!passwordError}
        />
        {touched ? (
          <FieldError message={passwordError} />
        ) : (
          <p className="mt-1.5 text-xs text-text-grey">
            8+ characters, with uppercase, lowercase, a number, and a special character.
          </p>
        )}
      </div>
      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
