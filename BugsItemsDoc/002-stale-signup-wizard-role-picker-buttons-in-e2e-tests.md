# Bug: phase-01-auth.spec.ts clicks role-picker buttons that no longer exist in SignupWizard

**Found:** 2026-09-15, while writing/running phase-12-vendor-onboarding.spec.ts
**Severity:** Low — test-suite staleness, not a product bug
**Status:** Open, not fixed (out of scope for this task — flagging only)

## Summary

`wedhub-frontend-app/e2e/phase-01-auth.spec.ts` clicks `page.getByRole("button", { name: "I'm a vendor" })` and `page.getByRole("button", { name: "I'm planning a wedding" })` as part of its signup flow tests (lines 56 and 123).

These buttons do not exist anywhere in the current codebase (confirmed via `grep -rn "I'm a vendor\|I'm planning a wedding" app/` — zero matches). `SignupWizard.tsx`'s own comment (lines 24-28) explains why: account type is decided by which link the user clicked *before* reaching `/signup` (a `?type=vendor` query param read server-side in `signup/page.tsx`), not by an in-wizard picker. There is no `step` in `SignupWizard.tsx` that renders a role-choice UI at all.

This means `phase-01-auth.spec.ts`'s vendor-signup and couple-signup tests would currently fail (or time out) if run today, since the click target never appears — the wizard would render whichever `accountType` the query param resolved to and simply sit on that step's real form instead.

## How this was found

Copied `phase-01`'s signup pattern into a new spec for vendor onboarding (`phase-12-vendor-onboarding.spec.ts`), ran it live against the real deployed app (`https://itsmykalyanam.com`), and it hung on `.click()` for "I'm a vendor" until the 60s test timeout — the actual page snapshot at timeout showed the couple/END_USER profile step ("First name / Last name"), confirming `accountType` had resolved to END_USER (the default when no `?type=vendor` param is present) and no such button ever existed to click.

## Fix

Trivial once noticed: navigate to `/signup?type=vendor` (or `/signup` for the couple/default path) directly, rather than clicking a role-picker button. `phase-12-vendor-onboarding.spec.ts` was written this way from the start after this was found.

Not fixed in `phase-01-auth.spec.ts` itself as part of this task (out of scope — this task was about vendor onboarding, and touching a different phase's spec wasn't requested), but should be corrected the next time that file is touched, since it is currently broken and would misreport a real regression as a flaky timeout instead.
