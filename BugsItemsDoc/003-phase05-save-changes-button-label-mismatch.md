# Bug: phase-05-vendor-profile.spec.ts expects a "Save changes" button that never appears for a DRAFT vendor

**Found:** 2026-09-15, while running phase-12-vendor-onboarding.spec.ts against the real app
**Severity:** Low — test-suite staleness, not a product bug
**Status:** Open, not fixed (out of scope for this task — flagging only)

## Summary

`ProfileEditor.tsx`'s last-tab action button label depends only on `canSubmitForReview`, which is `vendor.status === "DRAFT" || vendor.status === "REJECTED"` (line ~301) — nothing about completeness/how-filled-in the profile is. A brand-new vendor is always DRAFT, so this button reads **"Submit for review"** from the very first save onward, never "Save changes".

`phase-05-vendor-profile.spec.ts` line 103 does:
```ts
await page.getByRole("button", { name: "Save changes" }).click();
```
at the exact point in its flow (last tab, first save, vendor still DRAFT) where the real button reads "Submit for review" instead. Clicking that button calls `handleSave()` then `submitMyVendor()` in sequence (`ProfileEditor.tsx`'s `handleFinish()`) — so this test, if run today, would either time out waiting for a "Save changes" button that never renders, or (if Playwright's substring matching happens to still resolve it some other way) trigger an unintended early submit attempt.

## How this was found

Writing `phase-12-vendor-onboarding.spec.ts` (a new, adjacent onboarding spec) and running it live against `https://itsmykalyanam.com` hit this exact same button-label assumption, copied from `phase-05`'s pattern. The real page snapshot at that point in the flow showed the button labeled "Submit for review", not "Save changes", confirmed via Playwright's own error-context snapshot.

## Fix

`phase-12`'s own test was rewritten to expect "Submit for review" at this point, accept that clicking it triggers a (correctly-blocked, since no package exists yet) submit attempt, add the package afterward, then return and submit for real.

`phase-05-vendor-profile.spec.ts` was not changed as part of this task (out of scope), but its line 103 should be updated with the same understanding the next time that file is touched — otherwise it will misreport as a failure/flake rather than reflecting real, current button-label behavior.
