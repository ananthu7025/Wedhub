"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";

// Shown at /signup?type=vendor when the visitor is already signed in as an
// END_USER (customer). A single account's `role` is a fixed enum on the
// backend (END_USER | VENDOR | ADMIN) — there is no way to "add" a vendor
// role to an existing customer account, so the only real options are to
// keep the customer session or log out and register a fresh vendor account.
// This replaces the previous behavior of silently redirecting straight to
// /shortlist, which discarded the visitor's "register as vendor" intent
// with no explanation at all.
export function SwitchAccountForVendorSignup({ homeHref }: { homeHref: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleLogoutAndContinue() {
    setPending(true);
    const result = await logout();
    if (!result.success) {
      setPending(false);
      showToast(formatApiError(result.error), "error");
      return;
    }
    // Full navigation (not router.push) so every server component re-reads
    // the now-cleared session cookie, same pattern as AccountActions.tsx's
    // handleLogout.
    window.location.href = "/signup?type=vendor";
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 text-center">
      <h1 className="mb-2 text-xl font-bold text-brand-ink-soft">You&apos;re already signed in</h1>
      <p className="mb-6 text-sm text-text-grey">
        This browser is signed in to a customer account. Vendor accounts are separate, so registering as a vendor
        means logging out of this account first and signing up fresh.
      </p>

      <button
        type="button"
        onClick={handleLogoutAndContinue}
        disabled={pending}
        className="mb-3 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Logging out…" : "Log out and register as a vendor"}
      </button>
      <button
        type="button"
        onClick={() => router.push(homeHref)}
        disabled={pending}
        className="block w-full rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
      >
        Stay signed in to my account
      </button>
    </div>
  );
}
