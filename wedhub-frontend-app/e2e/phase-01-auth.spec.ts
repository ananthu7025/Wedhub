import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { deleteTestUser, uniqueTestEmail } from "./support/test-users";

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
    await page.goto("/signup");

    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Min. 8 characters").fill(password);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "I'm planning a wedding" }).click();

    // Wizard step 3: optional profile names (PATCH /users/me) — see
    // frontenddocs/11-progress-log.md's Frontend Arch Phase 1 entry for why
    // this is a separate step from registration itself.
    await expect(page.getByPlaceholder("e.g. Aditi")).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder("e.g. Aditi").fill("Test");
    await page.getByPlaceholder("e.g. Sharma").fill("Couple");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("You're all set!")).toBeVisible();
    await page.getByRole("button", { name: "Go to home" }).click();

    // roleHomeRoute sends END_USER to /shortlist (a real (couple) route,
    // fixed during Frontend Arch Phase 3 — it previously pointed at
    // /couple/home, a URL that could never resolve since (couple) is a route
    // GROUP and doesn't add a literal /couple/ path segment).
    await expect(page).toHaveURL(/\/shortlist/);
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

test.describe("Signup flow (VENDOR)", () => {
  const email = uniqueTestEmail("vendor");
  const password = "TestPass123!";

  test.afterAll(() => {
    deleteTestUser(email);
  });

  test("a vendor signup creates a real vendor and lands on the profile editor, not couple/admin routes", async ({ page }) => {
    await page.goto("/signup");

    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Min. 8 characters").fill(password);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "I'm a vendor" }).click();

    // Frontend Arch Phase 5 changed this step: register() alone never
    // creates a Vendor row, so the vendor path of the "profile" step now
    // asks for a business name and calls the real POST /vendors here,
    // rather than the couple path's firstName/lastName fields.
    await expect(page.getByPlaceholder(/Frame & Co/)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/Frame & Co/).fill("E2E Test Photography");
    await page.getByRole("button", { name: "Continue" }).click();

    // Both roles share the same "You're all set!" heading in SignupWizard.tsx
    // — only the subtext/CTA differ ("Complete your profile" for vendors).
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Complete your profile" }).click();

    await expect(page).toHaveURL(/\/vendor\/profile/);
    await expect(page.getByRole("heading", { name: "Edit profile" })).toBeVisible();

    // Same real behavior as the END_USER test above: proxy.ts blocks
    // /shortlist for a VENDOR session, then /login bounces the still-valid
    // session back via roleHomeRoute — which is /vendor/dashboard for the
    // login flow (only signup's own success screen sends a brand-new
    // vendor to /vendor/profile specifically, to nudge completing it).
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
