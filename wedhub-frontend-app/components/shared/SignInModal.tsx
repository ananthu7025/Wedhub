"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/Toast";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { login } from "@/lib/api/auth-client";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { formatApiError } from "@/lib/utils/error";
import { identifierSchema, loginPasswordSchema, validateField } from "@/lib/validation/auth-schemas";

/**
 * In-page "sign in to continue" popup — used wherever an unauthenticated
 * visitor tries to reveal vendor contact details or send an enquiry.
 * Previously both gates (VendorContactLinks.tsx, EnquiryCta.tsx) sent the
 * visitor to a full /login?next=... page, which lost their place on the
 * vendor profile. This keeps them on the page: on successful sign-in it
 * calls onSuccess, which the caller uses to continue the original action
 * (reveal contact / open the enquiry form) and refresh the server-rendered
 * isAuthenticated flag (see those two files' own comments for why a
 * router.refresh() is needed — isAuthenticated is read server-side via
 * getOptionalSession(), not client state).
 *
 * Modelled on the competitor pattern the user asked to match: a Google
 * button, a divider, an identifier field (email or phone, tab-switchable)
 * and a password field, "Forgot password?", and a "Sign up" footer link —
 * all without navigating away from the current page.
 */
export function SignInModal({
  vendorName,
  onClose,
  onSuccess,
}: {
  vendorName: string;
  onClose: () => void;
  onSuccess: (user: AuthenticatedUser) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ identifier?: boolean; password?: boolean }>({});
  const [pending, setPending] = useState(false);

  const identifierError = useMemo(() => validateField(identifierSchema, identifier), [identifier]);
  const passwordError = useMemo(() => validateField(loginPasswordSchema, password), [password]);
  const isFormValid = !identifierError && !passwordError;

  // Shared by both sign-in paths (password form below, and
  // GoogleSignInButton's onSuccess) — router.refresh() re-runs the vendor
  // page's server-side getOptionalSession() so isAuthenticated flips before
  // the caller's onSuccess continues the original action (reveal contact /
  // open the enquiry form). GoogleSignInButton has no refresh of its own,
  // so this must happen here rather than in the password-only handleSubmit.
  function handleSignedIn(user: AuthenticatedUser) {
    router.refresh();
    onSuccess(user);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ identifier: true, password: true });
    if (!isFormValid) return;

    setPending(true);
    const result = await login(identifier, password);
    setPending(false);

    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }

    handleSignedIn(result.data.user);
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-2xl bg-white p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="float-right border-none bg-transparent text-lg text-text-grey"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="mb-1 text-lg font-bold">Sign in to continue</h2>
        <p className="mb-5 text-sm text-text-grey">
          Sign in to see {vendorName}&apos;s contact details
        </p>

        <h3 className="mb-1 text-xl font-bold">Almost there!</h3>
        <p className="mb-5 text-sm text-text-grey">Sign in to see contact details</p>

        <div className="mb-5">
          <GoogleSignInButton onSuccess={handleSignedIn} />
        </div>

        <div className="mb-5 flex items-center gap-3 text-[12px] text-text-grey">
          <span className="h-px flex-1 bg-border" />
          OR
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-bold">{mode === "email" ? "Email" : "Phone"}</span>
            <div className="flex overflow-hidden rounded-md border border-border text-[12px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode("email");
                  setIdentifier("");
                  setTouched({});
                }}
                className={
                  mode === "email"
                    ? "bg-brand-primary px-3 py-1 text-white"
                    : "bg-white px-3 py-1 text-text-grey hover:bg-surface-input"
                }
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("phone");
                  setIdentifier("");
                  setTouched({});
                }}
                className={
                  mode === "phone"
                    ? "bg-brand-primary px-3 py-1 text-white"
                    : "bg-white px-3 py-1 text-text-grey hover:bg-surface-input"
                }
              >
                Phone
              </button>
            </div>
          </div>
          <div className="mb-4">
            <Input
              type={mode === "email" ? "email" : "tel"}
              placeholder={mode === "email" ? "you@example.com" : "10-digit mobile number"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
              invalid={touched.identifier && !!identifierError}
              autoComplete="username"
              autoFocus
            />
            {touched.identifier && <FieldError message={identifierError} />}
          </div>

          <div className="mb-1.5">
            <span className="mb-2 block text-[13px] font-bold">Password</span>
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

          <div className="mb-4 text-right">
            <Link href="/forgot-password" className="text-[13px] font-semibold text-text-grey hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mb-4 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p className="text-center text-[13px] text-text-grey">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-brand-primary hover:underline">
            Sign up
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] text-text-grey">
          By continuing, you agree to itsmyKalyanam&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
