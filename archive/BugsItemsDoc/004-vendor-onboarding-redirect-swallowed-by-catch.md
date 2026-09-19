# Bug: VendorOnboardingPage's "already has a listing" redirect is silently swallowed by its own catch block

**Found:** 2026-09-15, during Playwright E2E testing of vendor onboarding
**Severity:** Medium — a real, observable UI defect (not a security hole, but a broken guard)
**Status:** FIXED — see commit history for `app/(auth)/vendor-onboarding/page.tsx` around 2026-09-15

## Summary

`app/(auth)/vendor-onboarding/page.tsx` (lines 17-25):

```ts
try {
  const existing = await getMyVendor();
  if (existing?.data?.id) {
    redirect("/vendor/dashboard");
  }
} catch {
  // 404 expected when no vendor profile exists yet — continue to render the onboarding form.
}
```

`next/navigation`'s `redirect()` works by throwing a special `NEXT_REDIRECT` digest internally, which Next.js's framework catches further up the render pipeline to actually perform the redirect. Because this `redirect()` call sits *inside* the `try` block, its own throw is caught by this function's `catch {}` — which was only intended to catch the *expected* 404 from `getMyVendor()` when no vendor exists yet. The redirect is silently swallowed, and execution falls through to render the onboarding form anyway.

**Net effect:** a vendor who already has a listing, visiting `/vendor-onboarding` again for any reason (bookmarked link, back button, stale link in an email, etc.), sees the "Set up your vendor profile" form rendered again instead of being redirected to their dashboard — the exact guard this code was written to provide does not work.

This does not let them create a *second* vendor (the backend's `POST /vendors` still 409s — verified separately during the Part 2 functional pass), but it does show a broken, contradictory UI state (a "set up your listing" form for someone who already has one) instead of the intended clean redirect.

## How this was found

Live-verified against `https://itsmykalyanam.com` (test server) via Playwright:
1. Registered a fresh VENDOR account, logged in, went to `/vendor-onboarding`, filled in a business name, clicked "Complete Setup & Enter Dashboard →" — correctly landed on `/vendor/dashboard` (vendor created successfully).
2. Navigated to `/vendor-onboarding` again — expected an immediate redirect back to `/vendor/dashboard`. Instead, the empty "Business / Brand Name" form rendered again, confirmed via Playwright's page snapshot at the failed assertion.

## Fix

Move the `redirect()` call outside the `try/catch`, or re-throw redirect errors explicitly. The idiomatic Next.js fix:

```ts
let existing: Awaited<ReturnType<typeof getMyVendor>> | null = null;
try {
  existing = await getMyVendor();
} catch {
  // 404 expected when no vendor profile exists yet — continue to render the onboarding form.
}
if (existing?.data?.id) {
  redirect("/vendor/dashboard");
}
```

This keeps the try/catch scoped only to the actual fetch call (where a 404 is genuinely expected), and lets `redirect()`'s throw propagate normally once outside it.

Applied exactly as above — user approved fixing it immediately given its small size and direct relevance to the onboarding flow under test. Re-verified live afterward (see verification section below, added post-fix).

## Re-verification after fix

Re-ran the same live Playwright scenario against `https://itsmykalyanam.com` after deploying the fix: a fresh vendor creates a listing, then revisits `/vendor-onboarding` — now correctly redirects straight to `/vendor/dashboard` instead of re-rendering the empty setup form. Confirmed passing.
