"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { register, login, resendVerificationEmail } from "@/lib/api/auth-client";
import { updateMyProfile } from "@/lib/api/users-client";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { formatApiError } from "@/lib/utils/error";
import { trackEvent } from "@/lib/analytics/track";
import { emailSchema, passwordSchema, validateField } from "@/lib/validation/auth-schemas";

type AccountType = "END_USER" | "VENDOR";
type Step = "credentials" | "verify" | "profile";

// Account type comes from where the user entered signup (the footer's
// "Register as a Vendor" link is the only vendor entry point; every other
// signup link/button is couple-only) rather than an in-flow picker — per
// user decision, 2026-09-03: normal registration is end-user only, vendors
// get a distinct, separately-linked flow.
//
// Both roles end this wizard by redirecting into their own full profile-
// setup wizard rather than a "You're all set!" screen — VENDOR straight to
// /vendor-onboarding (item 3), END_USER to /profile-setup after this
// wizard's own quick name step (item 2, confirmed 2026-09-16: couples go
// through profile setup immediately after signup, before reaching the
// site, to maximize completion vs. leaving it as a some-day account-page
// task) — so there is no reachable "done" step left in this component.
export function SignupWizard({ accountType }: { accountType: AccountType }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credentialsTouched, setCredentialsTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [pending, setPending] = useState(false);

  const emailError = useMemo(() => validateField(emailSchema, email), [email]);
  const passwordError = useMemo(() => validateField(passwordSchema, password), [password]);
  const isCredentialsValid = !emailError && !passwordError;
  // Item 7: firstName is the only genuinely required field on this step —
  // lastName stays optional per the brief (only "the user's first name" is
  // required). Without this, a user could click Continue with both blank
  // and end up with firstName: null forever, with nothing ever prompting
  // them to add it later.
  const firstNameError = firstName.trim().length === 0 ? "First name is required" : null;

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredentialsTouched({ email: true, password: true });
    if (!isCredentialsValid) return;

    setPending(true);

    const registerResult = await register(email, password, accountType);
    if (!registerResult.success) {
      showToast(formatApiError(registerResult.error), "error");
      setPending(false);
      return;
    }

    const loginResult = await login(email, password);
    if (!loginResult.success) {
      showToast("Account created — please log in.", "info");
      setPending(false);
      router.push("/login");
      return;
    }

    if (accountType === "VENDOR") {
      trackEvent({ eventType: "vendor_registration_started" });
    }

    setPending(false);
    // A brand-new password-based account is always unverified at this point
    // (register() never stamps emailVerifiedAt — only Google sign-in and
    // verify-email confirmation do). Item 1: profile setup only happens
    // after verification, for both roles — see requireVerifiedMiddleware on
    // the backend (POST /vendors, PUT /users/me/wedding-profile), which
    // would otherwise 403 if this step were skipped straight to "profile".
    setStep("verify");
  }

  // Couple-only now — a vendor never reaches this step at all (see the
  // "verify" step and GoogleSignInButton's onSuccess below, both of which
  // route a VENDOR straight to /vendor-onboarding's full wizard instead).
  // On success, routes straight into /profile-setup (item 2's wedding-
  // details wizard) rather than "done" — confirmed 2026-09-16: a couple
  // goes through profile setup immediately after this quick name step,
  // before ever reaching the site, to maximize how many actually complete
  // it (vs. leaving it as a some-day account-page task).
  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFirstNameTouched(true);
    if (firstNameError) return;

    setPending(true);

    const result = await updateMyProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
    });
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      setPending(false);
      return;
    }

    setPending(false);
    router.push("/profile-setup");
  }

  if (step === "credentials") {
    return (
      <form onSubmit={handleCredentialsSubmit} className="w-full max-w-md">
        <h1 className="mb-1.5 text-xl font-bold">
          {accountType === "VENDOR" ? "List your business on itsmyKalyanam" : "Create your account"}
        </h1>
        <p className="mb-5 text-[13px] text-text-grey">
          {accountType === "VENDOR"
            ? "Set up a free vendor account to start receiving enquiries."
            : "Discover and enquire with wedding vendors near you."}
        </p>
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">Email</span>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setCredentialsTouched((t) => ({ ...t, email: true }))}
            invalid={credentialsTouched.email && !!emailError}
          />
          {credentialsTouched.email && <FieldError message={emailError} />}
        </div>
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">Create password</span>
          <PasswordInput
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setCredentialsTouched((t) => ({ ...t, password: true }))}
            invalid={credentialsTouched.password && !!passwordError}
          />
          {credentialsTouched.password ? (
            <FieldError message={passwordError} />
          ) : (
            <p className="mt-1.5 text-xs text-text-grey">
              8+ characters, with uppercase, lowercase, a number, and a special character.
            </p>
          )}
        </div>
        <p className="mb-4.5 text-xs leading-relaxed text-text-grey">
          By continuing, you agree to itsmyKalyanam&apos;s Terms of Service and Privacy Policy.
        </p>
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? "Creating your account…" : "Continue"}
        </Button>

        <div className="mb-4.5 mt-4.5 flex items-center gap-3 text-[12px] text-text-grey">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleSignInButton
          role={accountType}
          onSuccess={() => {
            // Google-authenticated accounts are pre-verified (see
            // auth.service.ts's createUserWithLinkedIdentity), so they skip
            // the "verify" step entirely — same vendor-onboarding routing
            // decision as that step's onVerified above applies here too.
            if (accountType === "VENDOR") {
              router.push("/vendor-onboarding");
              return;
            }
            setStep("profile");
          }}
        />
      </form>
    );
  }

  if (step === "verify") {
    // No onVerified callback anymore — verification now happens entirely via
    // the emailed link (VerifyEmailStatus.tsx), which redirects the session
    // straight to /verify-email/pending -> the right role's home route
    // (/vendor-onboarding for a vendor with no Vendor record yet, since
    // requireVendorOwnership treats that 404 as "needs onboarding"; see
    // lib/auth/require-vendor.ts). This wizard step just waits and offers a
    // resend — it never sees the moment verification actually completes.
    return <VerifyEmailStep email={email} />;
  }

  if (step === "profile") {
    return (
      <form onSubmit={handleProfileSubmit} className="w-full max-w-md">
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">First name</span>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => setFirstNameTouched(true)}
            invalid={firstNameTouched && !!firstNameError}
            placeholder="e.g. Aditi"
            maxLength={100}
          />
          {firstNameTouched && <FieldError message={firstNameError} />}
        </div>
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">
            Last name <span className="font-normal text-text-grey">(optional)</span>
          </span>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Sharma"
            maxLength={100}
          />
        </div>
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </form>
    );
  }

  return null;
}

const RESEND_COOLDOWN_SECONDS = 30;

// Shown right after registration, before profile setup — item 1: profile
// setup only happens after email verification, for both roles. Clicking the
// emailed link (verify-email/page.tsx) now verifies AND redirects on its own
// (see VerifyEmailStatus.tsx), so this step has no "I've verified" button —
// it just waits, with a way to resend the link if it doesn't arrive.
function VerifyEmailStep({ email }: { email: string }) {
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

  return (
    <div className="w-full max-w-md text-center">
      <h1 className="mb-2 text-xl font-bold">Verify your email</h1>
      <p className="mb-7 text-[13px] text-text-grey">
        We&apos;ve sent a verification link to <span className="font-semibold text-text-dark">{email}</span>. Check
        your inbox and click the link to continue — it&apos;ll take you straight to your dashboard.
      </p>

      <Button type="button" variant="secondary" block disabled={pending || cooldown > 0} onClick={handleResend}>
        {pending ? "Sending…" : cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend verification email"}
      </Button>
    </div>
  );
}
