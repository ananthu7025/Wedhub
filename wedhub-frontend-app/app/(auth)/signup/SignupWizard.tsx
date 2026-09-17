"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { register, login, resendVerificationEmail, refreshSession } from "@/lib/api/auth-client";
import { updateMyProfile } from "@/lib/api/users-client";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { formatApiError } from "@/lib/utils/error";
import { trackEvent } from "@/lib/analytics/track";

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
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const registerResult = await register(email, password, accountType);
    if (!registerResult.success) {
      setError(formatApiError(registerResult.error));
      setPending(false);
      return;
    }

    const loginResult = await login(email, password);
    if (!loginResult.success) {
      setError("Account created — please log in.");
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
    setPending(true);
    setError(null);

    if (firstName || lastName) {
      const result = await updateMyProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      if (!result.success) {
        setError(formatApiError(result.error));
        setPending(false);
        return;
      }
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
        {error && (
          <div className="mb-4 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">
            {error}
          </div>
        )}
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">Email</span>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">Create password</span>
          <Input
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            maxLength={128}
            required
          />
          <p className="mt-1.5 text-xs text-text-grey">Min. 8 characters.</p>
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
    return (
      <VerifyEmailStep
        email={email}
        onVerified={() => {
          // Item 3, 2026-09-16: vendor onboarding is now a full multi-step
          // wizard (business name, category, city, pricing, description —
          // see (auth)/vendor-onboarding/VendorOnboardingForm.tsx), not just
          // a business-name field. Routing a freshly-verified vendor there
          // directly (instead of this wizard's own inline "profile" step,
          // which only ever collected business name) means every vendor
          // signs up through that one richer flow — no separate, thinner
          // vendor-creation path left to keep in sync with it.
          if (accountType === "VENDOR") {
            router.push("/vendor-onboarding");
            return;
          }
          setStep("profile");
        }}
      />
    );
  }

  if (step === "profile") {
    return (
      <form onSubmit={handleProfileSubmit} className="w-full max-w-md">
        {error && (
          <div className="mb-4 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">
            {error}
          </div>
        )}
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">First name</span>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Aditi"
            maxLength={100}
          />
        </div>
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">Last name</span>
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
// emailed link (verify-email/page.tsx) is what actually verifies the
// account; onVerified below is triggered by refreshSession() re-minting an
// access token that reflects the now-current emailVerifiedAt (see
// verify-email/pending/VerifyEmailPendingPanel.tsx's identical pattern,
// which this mirrors for the case where the user never leaves this wizard).
function VerifyEmailStep({ email, onVerified }: { email: string; onVerified: () => void }) {
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setPending(true);
    setError(null);
    setSentMessage(null);
    const result = await resendVerificationEmail();
    setPending(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setSentMessage(`Verification email sent to ${email}.`);
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

  async function handleCheckAgain() {
    setChecking(true);
    setError(null);
    const result = await refreshSession();
    setChecking(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onVerified();
  }

  return (
    <div className="w-full max-w-md text-center">
      <h1 className="mb-2 text-xl font-bold">Verify your email</h1>
      <p className="mb-7 text-[13px] text-text-grey">
        We&apos;ve sent a verification link to <span className="font-semibold text-text-dark">{email}</span>. Check
        your inbox and click the link to continue.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">{error}</div>}
      {sentMessage && (
        <div className="mb-4 rounded-md bg-emerald-10 px-4 py-3 text-[13px] font-semibold text-emerald-70">
          {sentMessage}
        </div>
      )}

      <Button type="button" variant="primary" block disabled={checking} onClick={handleCheckAgain}>
        {checking ? "Checking…" : "I've verified — continue"}
      </Button>
      <div className="mt-3">
        <Button type="button" variant="secondary" block disabled={pending || cooldown > 0} onClick={handleResend}>
          {pending ? "Sending…" : cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend verification email"}
        </Button>
      </div>
    </div>
  );
}
