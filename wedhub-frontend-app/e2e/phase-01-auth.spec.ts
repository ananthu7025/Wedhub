import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { deleteTestUser, deleteVendorByBusinessName, uniqueTestEmail, verifyTestUserEmail } from "./support/test-users";

/**
 * Frontend Arch Phase 0/1 verification — see frontenddocs/03-stage-foundation.md.
 * Exercises what was previously verified via curl in frontenddocs/11-progress-log.md,
 * now as a real, visible browser flow against the live backend. Every test
 * creates its own account and deletes it afterward — no leftover test data.
 *
 * Rate limits are real (wedhub-backend/src/common/middleware/rate-limit.middleware.ts):
 * login is capped at 10 attempts / 15 min, register at 20 / hour, both keyed
 * by IP with in-memory (not Redis) storage. This suite makes ~5 login calls
 * and 2 register calls per full run — comfortably under those caps for a
 * single run, but repeated back-to-back runs during debugging can trip the
 * login limiter. If a run fails with "Too many login attempts", that is the
 * real rate limiter working correctly, not an app bug — wait 15 minutes (or
 * restart the backend dev process, which resets its in-memory limiter state)
 * before rerunning, rather than treating it as a regression.
 */

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

test.describe("Design system smoke test", () => {
  // The home page was a Phase 0 placeholder when this test was first
  // written; Frontend Arch Phase 2 replaced it with the real hero
  // search/category-browse/featured-vendors page (see
  // frontenddocs/04-stage-couple-experience.md) — updated here to match
  // what's actually there now, since Phase 2's own verification run covered
  // this content under its own spec, not this one.
  test("home page renders ported tokens and real content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /discover and connect/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });
});

test.describe("Signup + login flow (END_USER)", () => {
  const email = uniqueTestEmail("couple");
  const password = "TestPass123!";

  test.afterAll(() => {
    deleteTestUser(email);
  });

  test("a couple can sign up, land on couple home, log out, and log back in", async ({ page }) => {
    // Plain /signup (no ?type=vendor) resolves accountType to END_USER
    // server-side (signup/page.tsx) — there is no in-wizard role-picker step
    // to click (SignupWizard.tsx's own comment explains why: account type
    // comes from which link the user arrived via, not an in-flow choice).
    // See BugsItemsDoc/002 — this test used to click a
    // "I'm planning a wedding" button that hasn't existed since account type
    // moved to the entry-link/query-param, which meant this test hung for
    // the full 60s timeout instead of actually verifying the signup flow.
    await page.goto("/signup");

    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Min. 8 characters").fill(password);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 2026-09-16: signup now always shows a "verify your email" step right
    // after registration, for both roles (item 1 — see auth service's
    // resendVerificationEmail/PLAN-2026-09-16). No e2e test can click a real
    // emailed link, so stamp verification directly via psql (same
    // substitute-for-unscriptable-step pattern as approveVendor() below),
    // then drive the real "I've verified — continue" button.
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible({ timeout: 10_000 });
    verifyTestUserEmail(email);
    await page.getByRole("button", { name: "I've verified — continue" }).click();

    // Wizard step 3: optional profile names (PATCH /users/me) — see
    // frontenddocs/11-progress-log.md's Frontend Arch Phase 1 entry for why
    // this is a separate step from registration itself.
    await expect(page.getByPlaceholder("e.g. Aditi")).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder("e.g. Aditi").fill("Test");
    await page.getByPlaceholder("e.g. Sharma").fill("Couple");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 2026-09-16: signup now routes a couple straight into /profile-setup
    // (item 2's wedding-details wizard) instead of a "You're all set!"
    // screen — see PLAN-2026-09-16-signup-onboarding-inbox.md's Phase 2/
    // "wizard placement" decision. The wizard itself gets its own dedicated
    // spec (phase-profile-setup.spec.ts); this test only needs to get past
    // it to reach /shortlist for the role-gating/logout assertions below,
    // so it takes the fastest path through: one event date, one category,
    // no budget.
    await expect(page).toHaveURL(/\/profile-setup/, { timeout: 10_000 });
    // Step 1: Event dates.
    await page.getByRole("button", { name: "+ Add a function" }).click();
    await page.locator('input[type="date"]').fill("2027-06-15");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 2: City (required — see Phase 6/item 8's matching, which needs a
    // location) + guest count (left blank — optional).
    await expect(page.getByRole("heading", { name: "Expected number of visitors" })).toBeVisible({ timeout: 10_000 });
    await page.locator("select").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 3: Categories — select whichever loaded first, name unknown
    // (real seeded data, not fixture-controlled by this test).
    await expect(page.getByRole("heading", { name: "Vendors you'd like to explore" })).toBeVisible({ timeout: 10_000 });
    const categoryStep = page.locator("div").filter({ has: page.getByRole("heading", { name: "Vendors you'd like to explore" }) }).last();
    await categoryStep.getByRole("button").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 4: Budget (left blank — optional).
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 5: Review & submit.
    await page.getByRole("button", { name: "Submit" }).click();

    // roleHomeRoute sends END_USER to /shortlist (a real (couple) route,
    // fixed during Frontend Arch Phase 3 — it previously pointed at
    // /couple/home, a URL that could never resolve since (couple) is a route
    // GROUP and doesn't add a literal /couple/ path segment).
    await expect(page).toHaveURL(/\/shortlist/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Your shortlist" })).toBeVisible();

    // Role gating: this END_USER session must never actually reach vendor or
    // admin routes. proxy.ts redirects both to /login; the login page then
    // sees the still-valid session and bounces straight back to /shortlist
    // (its own already-authenticated redirect) rather than showing the
    // login form again.
    await page.goto("/vendor/dashboard");
    await expect(page).toHaveURL(/\/shortlist/, { timeout: 10_000 });

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/shortlist/, { timeout: 10_000 });

    // Log out via the Route Handler directly (POST /api/auth/logout) — there
    // is no logout *button* anywhere yet, since no authenticated
    // sidebar/topbar exists until Frontend Arch Phase 2+ builds real
    // (couple)/(vendor)/(admin) pages. This still exercises the real thing
    // Phase 1 delivers: the logout Route Handler actually clearing both
    // cookies. See lib/api/auth-client.ts's logout() for the browser-side
    // equivalent a future page will call once there's a page to call it from.
    const logoutResponse = await page.request.post("/api/auth/logout");
    expect(logoutResponse.ok()).toBe(true);

    // Now unauthenticated — /login should render the real form instead of
    // bouncing to a dashboard.
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/shortlist/);
  });
});

test.describe("Signed-in customer clicking 'Register as a Vendor'", () => {
  const email = uniqueTestEmail("switcher");
  const password = "TestPass123!";

  test.afterAll(() => {
    deleteTestUser(email);
  });

  // Regression test for the bug where /signup?type=vendor unconditionally
  // redirected any already-authenticated visitor to roleHomeRoute[role]
  // before ever reading the ?type= param — for a signed-in END_USER that
  // silently sent them to /shortlist, discarding their vendor-signup intent
  // with zero explanation. Role is a single fixed enum on User (END_USER |
  // VENDOR | ADMIN), so an existing customer session can never gain a vendor
  // role — the fix offers logout instead of a silent redirect.
  test("sees a logout prompt instead of being redirected to the shortlist", async ({ page }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Min. 8 characters").fill(password);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // See the couple-signup test above — signup always shows a "verify your
    // email" step first now (item 1, 2026-09-16).
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible({ timeout: 10_000 });
    verifyTestUserEmail(email);
    await page.getByRole("button", { name: "I've verified — continue" }).click();
    await expect(page.getByPlaceholder("e.g. Aditi")).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder("e.g. Aditi").fill("Test");
    await page.getByPlaceholder("e.g. Sharma").fill("Switcher");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 2026-09-16: signup now routes a couple into /profile-setup instead of
    // a "You're all set!" screen (see the couple-signup test above). This
    // test only needs a signed-in END_USER session to exercise the redirect
    // bug below, not a completed profile — navigate away with the wizard
    // still untouched (WizardGuard's hasUnsavedChanges only turns true once
    // an event date or category is actually added) so no "leave this page?"
    // prompt is in the way.
    await expect(page).toHaveURL(/\/profile-setup/, { timeout: 10_000 });

    // Now, still signed in as this END_USER, follow the footer's "Register
    // as a Vendor" link's actual target.
    await page.goto("/signup?type=vendor");

    await expect(page).toHaveURL(/\/signup\?type=vendor/);
    await expect(page.getByRole("heading", { name: "You're already signed in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out and register as a vendor" })).toBeVisible();

    // "Stay signed in" must not lose the session or navigate to signup's
    // own form — it should return to the account's real home route.
    await page.getByRole("button", { name: "Stay signed in to my account" }).click();
    await expect(page).toHaveURL(/\/shortlist/);
  });
});

test.describe("Signup flow (VENDOR)", () => {
  const email = uniqueTestEmail("vendor");
  const password = "TestPass123!";

  test.afterAll(() => {
    // vendors.owner_user_id is ON DELETE SET NULL, not CASCADE — deleting
    // just the owner user below would orphan this vendor row forever
    // instead of removing it (confirmed as a real, reproducible bug: 29
    // orphaned "E2E Test Photography"/"Inbox Test Photography" rows had
    // silently accumulated across every past run of this and
    // phase-messaging.spec.ts before this fix, each one competing with
    // later tests' own vendors inside rankVendors()'s top-N cutoff and
    // causing an intermittent, hard-to-explain failure in
    // phase-matching.spec.ts. deleteVendorByBusinessName must run BEFORE
    // deleteTestUser, same ordering rule as deleteVendorById elsewhere in
    // this file.
    deleteVendorByBusinessName("E2E Test Photography");
    deleteTestUser(email);
  });

  test("a vendor signup creates a real vendor and lands on the profile editor, not couple/admin routes", async ({ page }) => {
    // /signup?type=vendor resolves accountType to VENDOR server-side
    // (signup/page.tsx) — see BugsItemsDoc/002: this test used to click a
    // non-existent "I'm a vendor" role-picker button and hang for the full
    // 60s timeout instead of ever reaching the real vendor profile step.
    await page.goto("/signup?type=vendor");

    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Min. 8 characters").fill(password);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // 2026-09-16: POST /vendors is now gated behind requireVerifiedMiddleware
    // (item 1 — profile setup only happens after email verification), so a
    // brand-new password-based signup now lands on SignupWizard's "verify"
    // step here, not straight on the business-name form. No e2e test can
    // click a real emailed link, so this substitutes for that the same way
    // approveVendor() substitutes for the not-yet-scriptable admin-review UI
    // elsewhere in this file: stamp verification directly via psql, then
    // drive the real "I've verified — continue" button, which calls the
    // real refreshSession() endpoint to pick up the now-verified claim.
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible({ timeout: 10_000 });
    verifyTestUserEmail(email);
    await page.getByRole("button", { name: "I've verified — continue" }).click();

    // 2026-09-16 (item 3): a verified vendor now goes straight to
    // /vendor-onboarding's full multi-step wizard (business name, category,
    // city, pricing, description) instead of a single business-name field
    // inline in this wizard — see PLAN-2026-09-16-signup-onboarding-inbox.md
    // Phase 3 and SignupWizard.tsx's "verify" step comment.
    await expect(page).toHaveURL(/\/vendor-onboarding/, { timeout: 10_000 });
    // VendorOnboardingForm.tsx's placeholder ("e.g. Royal Blooms
    // Photography") differs from SignupWizard's old inline vendor-profile
    // step ("e.g. Frame & Co. Photography") — this now lands on the
    // standalone /vendor-onboarding page's own form, not that inline one.
    await expect(page.getByPlaceholder(/Royal Blooms/)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/Royal Blooms/).fill("E2E Test Photography");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 2: category + city (both required).
    await page.locator("select").first().selectOption({ index: 1 });
    await page.locator("select").nth(1).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3: pricing & description (all optional — skip straight through).
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 4: review & submit — this is what actually calls POST /vendors.
    await page.getByRole("button", { name: "Complete Setup & Enter Dashboard" }).click();

    await expect(page).toHaveURL(/\/vendor\/dashboard/, { timeout: 10_000 });

    // Same real behavior as the END_USER test above: proxy.ts blocks
    // /shortlist for a VENDOR session, then /login bounces the still-valid
    // session back via roleHomeRoute to /vendor/dashboard.
    await page.goto("/shortlist");
    await expect(page).toHaveURL(/\/vendor\/dashboard/, { timeout: 10_000 });
  });
});

test.describe("Invalid login", () => {
  test("shows an inline error for wrong credentials, no crash", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill("nonexistent-e2e@wedhub.dev");
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Forgot password", () => {
  test("request form submits and shows the non-leaking confirmation message", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("Email address").fill("someone@wedhub.dev");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText(/if an account exists/i)).toBeVisible();
  });

  test("reset page without a token shows the invalid-link message", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText(/missing or invalid/i)).toBeVisible();
  });
});
