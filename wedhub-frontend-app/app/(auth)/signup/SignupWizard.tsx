"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { register, login } from "@/lib/api/auth-client";
import { updateMyProfile } from "@/lib/api/users-client";
import type { UserRole } from "@/lib/auth/types";

type AccountType = "END_USER" | "VENDOR";
type Step = "credentials" | "account-type" | "profile" | "done";

const roleHomeRoute: Record<UserRole, string> = {
  END_USER: "/couple/home",
  VENDOR: "/vendor/dashboard",
  ADMIN: "/admin/dashboard",
};

export function SignupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("END_USER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStep("account-type");
  }

  async function handleAccountTypeSelect(type: AccountType) {
    setAccountType(type);
    setError(null);
    setPending(true);

    const registerResult = await register(email, password, type);
    if (!registerResult.success) {
      setError(registerResult.error.message);
      setPending(false);
      setStep("credentials");
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

    if (firstName || lastName) {
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
            required
          />
          <p className="mt-1.5 text-xs text-text-grey">Min. 8 characters.</p>
        </div>
        <p className="mb-4.5 text-xs leading-relaxed text-text-grey">
          By continuing, you agree to WedHub&apos;s Terms of Service and Privacy Policy.
        </p>
        <Button type="submit" variant="primary" block>
          Continue
        </Button>
      </form>
    );
  }

  if (step === "account-type") {
    return (
      <div className="w-full max-w-md">
        {error && (
          <div className="mb-4 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleAccountTypeSelect("END_USER")}
            className="rounded-xl border-[1.5px] border-border p-6 text-center transition-colors hover:border-brand-primary hover:bg-brand-primary-soft disabled:opacity-50"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
              ♥
            </div>
            <h3 className="mb-1 text-[15px] font-bold">I&apos;m planning a wedding</h3>
            <p className="text-xs text-text-grey">Discover and enquire with vendors near you.</p>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleAccountTypeSelect("VENDOR")}
            className="rounded-xl border-[1.5px] border-border p-6 text-center transition-colors hover:border-brand-primary hover:bg-brand-primary-soft disabled:opacity-50"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
              ⚑
            </div>
            <h3 className="mb-1 text-[15px] font-bold">I&apos;m a vendor</h3>
            <p className="text-xs text-text-grey">List your business and receive enquiries.</p>
          </button>
        </div>
        {pending && <p className="mt-4 text-center text-sm text-text-grey">Creating your account…</p>}
      </div>
    );
  }

  if (step === "profile") {
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
