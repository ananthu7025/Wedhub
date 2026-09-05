"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary for every /vendor/* page.
 * Catches unhandled runtime errors within the (vendor) route group
 * gracefully, preventing blank/raw 500 error pages and giving the user
 * actionable recovery options.
 */
export default function VendorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Vendor layout error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-6 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-10 text-2xl text-red-70 font-bold">
        !
      </div>
      <h1 className="mb-2 text-xl font-bold text-text-dark">Something went wrong loading your dashboard</h1>
      <p className="mb-6 max-w-md text-sm text-text-grey">
        We encountered an unexpected error while preparing your vendor workspace. You can try reloading the page, or return to login.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-primary-hover"
        >
          Try again
        </button>
        <Link
          href="/login"
          className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-bold text-text-dark no-underline transition-colors hover:bg-surface-input"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
