"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { useToast } from "@/components/ui/Toast";
import { login } from "@/lib/api/auth-client";
import type { UserRole } from "@/lib/auth/types";
import { formatApiError } from "@/lib/utils/error";
import { identifierSchema, loginPasswordSchema, validateField } from "@/lib/validation/auth-schemas";

const roleHomeRoute: Record<UserRole, string> = {
  END_USER: "/shortlist",
  VENDOR: "/vendor/dashboard",
  ADMIN: "/admin/dashboard",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ identifier?: boolean; password?: boolean }>({});
  const [pending, setPending] = useState(false);

  const identifierError = useMemo(() => validateField(identifierSchema, identifier), [identifier]);
  const passwordError = useMemo(() => validateField(loginPasswordSchema, password), [password]);
  const isFormValid = !identifierError && !passwordError;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ identifier: true, password: true });
    if (!isFormValid) return;

    setPending(true);
    const result = await login(identifier, password);

    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      setPending(false);
      return;
    }

    goToDestination(result.data.user.role);
  }

  function goToDestination(role: UserRole) {
    const next = searchParams.get("next") || searchParams.get("redirect");
    const destination = next ?? roleHomeRoute[role];
    // router.refresh() previously ran right after push() — refresh() re-renders
    // the CURRENT route from the server, which raced push()'s own in-flight
    // navigation to the new route and could leave the browser stuck on
    // /login?next=... with a blank page until a manual reload. push() alone
    // already fetches a fresh server render for the destination route (which
    // is always different from /login here), so refresh() was redundant.
    router.push(destination);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <div className="mb-4.5">
        <Input
          type="text"
          placeholder="Email or phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
          invalid={touched.identifier && !!identifierError}
          autoComplete="username"
        />
        {touched.identifier && <FieldError message={identifierError} />}
      </div>
      <div className="mb-4">
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          invalid={touched.password && !!passwordError}
          autoComplete="current-password"
        />
        {touched.password && <FieldError message={passwordError} />}
      </div>

      <Button type="submit" variant="primary" block disabled={pending} className="mb-4">
        {pending ? "Logging in…" : "Log in"}
      </Button>

      <div className="mb-4 flex items-center gap-3 text-[12px] text-text-grey">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-4">
        <GoogleSignInButton onSuccess={(user) => goToDestination(user.role)} />
      </div>
    </form>
  );
}
