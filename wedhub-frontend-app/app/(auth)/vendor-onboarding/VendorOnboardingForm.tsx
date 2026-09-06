"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createVendor } from "@/lib/api/vendor-onboarding-client";
import { formatApiError } from "@/lib/utils/error";

export function VendorOnboardingForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessName.trim()) {
      setError("Please enter your business or brand name.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await createVendor(businessName.trim());
      if (!result.success) {
        setError(formatApiError(result.error));
        setPending(false);
        return;
      }

      // router.refresh() previously ran right after push() here — same race
      // as LoginForm.tsx's goToDestination: refresh() re-renders the
      // CURRENT route from the server while push()'s own navigation to the
      // new route is still in flight, which could leave the browser stuck
      // with a blank page until a manual reload. push() alone already
      // fetches a fresh server render for the destination route.
      router.push("/vendor/dashboard");
    } catch {
      setError("Failed to create vendor listing. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {error && (
        <div className="rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="businessName" className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">
          Business / Brand Name *
        </label>
        <Input
          id="businessName"
          type="text"
          placeholder="e.g. Royal Blooms Photography"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          autoFocus
          disabled={pending}
        />
        <p className="mt-1.5 text-xs text-text-grey">
          This is the name couples will see on your public storefront and portfolio. You can edit this anytime.
        </p>
      </div>

      <Button type="submit" disabled={pending} className="w-full py-3 text-sm font-bold">
        {pending ? "Creating your listing…" : "Complete Setup & Enter Dashboard →"}
      </Button>
    </form>
  );
}
