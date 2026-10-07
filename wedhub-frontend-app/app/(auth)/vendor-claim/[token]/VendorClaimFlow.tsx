"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/portfolio/icons";
import { useToast } from "@/components/ui/Toast";
import {
  claimRegister,
  resolveClaimInvitation,
  sendClaimOtp,
  verifyClaimOtp,
  type ResolveClaimInvitationData,
} from "@/lib/api/vendor-claim-client";
import { emailSchema, passwordSchema, validateField } from "@/lib/validation/auth-schemas";
import { formatApiError } from "@/lib/utils/error";

// Three vendor-facing screens, in order, matching the flow confirmed with
// the user (no separate "claim this listing" landing screen — contact
// confirm is the very first thing shown):
//   1. confirm-contact — read-only masked contact, "Send verification code"
//   2. otp             — 6-digit code entry, resend with cooldown
//   3. password         — set password, submit -> logged in, redirected
// "resolving"/"invalid" bracket the whole flow: resolving the token happens
// once on mount, and an invalid/expired/already-claimed token short-circuits
// straight to an error state before any of the 3 screens are shown.
type Step = "resolving" | "invalid" | "confirm-contact" | "otp" | "password" | "success";

const RESEND_COOLDOWN_SECONDS = 30;

export function VendorClaimFlow({ token }: { token: string }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("resolving");
  const [invitation, setInvitation] = useState<ResolveClaimInvitationData | null>(null);
  const [invalidMessage, setInvalidMessage] = useState("");

  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credentialsTouched, setCredentialsTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const emailError = useMemo(() => validateField(emailSchema, email), [email]);
  const passwordError = useMemo(() => validateField(passwordSchema, password), [password]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await resolveClaimInvitation(token);
      if (cancelled) return;

      if (!result.success) {
        setInvalidMessage(formatApiError(result.error));
        setStep("invalid");
        return;
      }

      setInvitation(result.data);
      // The email field on the password screen is left blank regardless of
      // which contact the invitation used — invitedEmail here is already
      // masked (e.g. "j***@example.com"), so it's never suitable to
      // pre-fill an input the vendor would have to notice and overwrite,
      // and a phone-only invitation has no email to pre-fill anyway
      // (VendorInvitationOtp only proves phone ownership; the account
      // itself still needs a real email, per claimRegisterSchema on the
      // backend).
      setStep("confirm-contact");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSendOtp() {
    setSendingOtp(true);
    const result = await sendClaimOtp(token);
    setSendingOtp(false);

    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }

    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setStep("otp");
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }
    setVerifyingOtp(true);
    setOtpError("");
    const result = await verifyClaimOtp(token, otpCode);
    setVerifyingOtp(false);

    if (!result.success) {
      setOtpError(formatApiError(result.error));
      return;
    }

    setStep("password");
  }

  async function handleSubmitPassword() {
    setCredentialsTouched({ email: true, password: true });
    if (emailError || passwordError) return;

    setSubmitting(true);
    setSubmitError("");
    const result = await claimRegister({ token, email, password });
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(formatApiError(result.error));
      return;
    }

    setStep("success");
    router.push("/vendor/dashboard");
  }

  if (step === "resolving") {
    return <p className="text-center text-sm text-text-grey">Loading your invitation…</p>;
  }

  if (step === "invalid") {
    return (
      <div className="text-center">
        <h1 className="mb-3 text-2xl font-bold text-brand-ink-soft">Claim your vendor profile</h1>
        <p className="mb-6 text-sm text-red-70">{invalidMessage || "This invitation link is invalid."}</p>
        <p className="text-sm text-text-grey">
          <Link href="/login" className="font-semibold text-brand-primary no-underline">
            Log in
          </Link>{" "}
          or contact us if you believe this is a mistake.
        </p>
      </div>
    );
  }

  const contactDisplay = invitation?.invitedEmail ?? invitation?.invitedPhone ?? "";
  const contactChannelLabel = invitation?.invitedEmail ? "email" : "WhatsApp";

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-bold text-brand-ink-soft">Claim your vendor profile</h1>
      {invitation && (
        <p className="mb-6 text-center text-sm text-text-grey">
          for <span className="font-semibold text-text-dark">{invitation.businessName}</span>
        </p>
      )}

      {step === "confirm-contact" && (
        <div>
          <p className="mb-4 text-sm text-text-grey">
            We&apos;ll send a verification code to the {contactChannelLabel} on file for this listing:
          </p>
          {/* Read-only, not editable — see the plan's locked-contact
              decision. Showing the masked value here (not a plain input)
              makes clear this field cannot be typed into. */}
          <div className="mb-6 rounded-md border border-border bg-surface-input px-4 py-3 text-sm font-semibold text-text-dark">
            {contactDisplay}
          </div>
          <Button block onClick={handleSendOtp} disabled={sendingOtp}>
            {sendingOtp ? "Sending…" : "Send verification code"}
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div>
          <p className="mb-4 text-sm text-text-grey">
            Enter the 6-digit code we sent to {contactDisplay}.
          </p>
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            invalid={!!otpError}
            className="mb-2 text-center text-lg tracking-[0.5em]"
            autoComplete="one-time-code"
          />
          {otpError && <FieldError message={otpError} />}
          <Button block onClick={handleVerifyOtp} disabled={verifyingOtp} className="mt-4">
            {verifyingOtp ? "Verifying…" : "Verify"}
          </Button>
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={resendCooldown > 0 || sendingOtp}
            className="mt-4 w-full text-center text-sm font-semibold text-brand-primary disabled:text-text-grey disabled:opacity-60"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      )}

      {step === "password" && (
        <div>
          <p className="mb-4 text-sm text-text-grey">You&apos;re verified — now set up your login.</p>

          <label className="mb-4 block">
            <span className="mb-2 block text-[13px] font-bold">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setCredentialsTouched((t) => ({ ...t, email: true }))}
              invalid={credentialsTouched.email && !!emailError}
              autoComplete="email"
            />
            {credentialsTouched.email && <FieldError message={emailError} />}
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block text-[13px] font-bold">Create password</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setCredentialsTouched((t) => ({ ...t, password: true }))}
              invalid={credentialsTouched.password && !!passwordError}
              autoComplete="new-password"
            />
            {credentialsTouched.password && <FieldError message={passwordError} />}
          </label>

          {submitError && <p className="mb-4 text-sm text-red-70">{submitError}</p>}

          <Button block onClick={handleSubmitPassword} disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-10 text-emerald-70">
            <CheckIcon className="h-6 w-6" />
          </div>
          <p className="text-sm text-text-grey">Your account is ready — redirecting to your dashboard…</p>
        </div>
      )}
    </div>
  );
}
