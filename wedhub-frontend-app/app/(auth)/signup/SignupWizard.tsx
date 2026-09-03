"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { register, login } from "@/lib/api/auth-client";
import { updateMyProfile } from "@/lib/api/users-client";
import { createVendor } from "@/lib/api/vendor-onboarding-client";
import type { UserRole } from "@/lib/auth/types";

type AccountType = "END_USER" | "VENDOR";
type Step = "credentials" | "profile" | "done";

const roleHomeRoute: Record<UserRole, string> = {
  END_USER: "/shortlist",
  VENDOR: "/vendor/profile",
  ADMIN: "/admin/dashboard",
};

// Account type comes from where the user entered signup (the footer's
// "Register as a Vendor" link is the only vendor entry point; every other
// signup link/button is couple-only) rather than an in-flow picker — per
// user decision, 2026-09-03: normal registration is end-user only, vendors
// get a distinct, separately-linked flow.
export function SignupWizard({ accountType }: { accountType: AccountType }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const registerResult = await register(email, password, accountType);
    if (!registerResult.success) {
      setError(registerResult.error.message);
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

    setPending(false);
    setStep("profile");
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    if (accountType === "VENDOR") {
      const result = await createVendor(businessName);
      if (!result.success) {
        setError(result.error.message);
        setPending(false);
        return;
      }
    } else if (firstName || lastName) {
      await updateMyProfile({ firstName: firstName || undefined, lastName: lastName || undefined });
    }

    setPending(false);
    setStep("done");
  }

  function goToDashboard() {
    router.push(roleHomeRoute[accountType]);
    router.refresh();
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
      </form>
    );
  }

  if (step === "profile") {
    if (accountType === "VENDOR") {
      return (
        <form onSubmit={handleProfileSubmit} className="w-full max-w-md">
          {error && (
            <div className="mb-4 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">
              {error}
            </div>
          )}
          <div className="mb-4.5">
            <span className="mb-2 block text-[13px] font-bold">Business name</span>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Frame & Co. Photography"
              required
            />
            <p className="mt-1.5 text-xs text-text-grey">You can add photos, packages and more details next.</p>
          </div>
          <Button type="submit" variant="primary" block disabled={pending}>
            {pending ? "Creating your listing…" : "Continue"}
          </Button>
        </form>
      );
    }

    return (
      <form onSubmit={handleProfileSubmit} className="w-full max-w-md">
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">First name</span>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Aditi" />
        </div>
        <div className="mb-4.5">
          <span className="mb-2 block text-[13px] font-bold">Last name</span>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Sharma" />
        </div>
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </form>
    );
  }

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-10 text-emerald-70">
        ✓
      </div>
      <h2 className="mb-2.5 text-2xl font-bold">You&apos;re all set!</h2>
      <p className="mb-7 text-[15px] text-text-grey">
        {accountType === "VENDOR"
          ? "Your free listing is live. Complete your profile so couples can find and trust you."
          : "Start exploring vendors near you or tell us what you're looking for."}
      </p>
      <Button variant="primary" block onClick={goToDashboard}>
        {accountType === "VENDOR" ? "Complete your profile" : "Go to home"}
      </Button>
    </div>
  );
}
