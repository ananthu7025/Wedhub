"use client";

import Link from "next/link";
import { useEffect } from "react";

// Root-level error boundary — catches any unhandled render error not
// already caught by a more specific boundary (e.g. (admin)/error.tsx,
// (vendor)/error.tsx). No root-level boundary existed before this (SEO
// audit finding, matches archive's still-open Frontend Arch Phase 11c
// checklist item) — every other route fell through to Next's generic,
// unbranded "Application error" screen.
export default function RootError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-6 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-10 text-2xl text-red-70">
        !
      </div>
      <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
      <p className="mb-6 max-w-sm text-sm text-text-grey">
        This page couldn&apos;t load. Try again, or head back to the homepage.
      </p>
      <Link
        href="/"
        className="rounded-md bg-brand-primary px-5 py-3 text-sm font-bold text-white no-underline"
      >
        Back to home
      </Link>
    </div>
  );
}
