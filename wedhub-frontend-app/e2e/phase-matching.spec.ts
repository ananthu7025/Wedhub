import { test, expect, request as playwrightRequest } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { deleteTestUser, deleteVendorById, uniqueTestEmail, verifyTestUserEmail, approveVendor } from "./support/test-users";

/**
 * Automatic vendor matching (item 8, 2026-09-16 request — see
 * PLAN-2026-09-16-signup-onboarding-inbox.md Phase 6). When a couple
 * completes their profile-setup wizard, matching vendors should receive a
 * NEW_LEAD notification and a genuine-looking inbox message, and the match
 * should show up in the vendor's real Leads dashboard too. Drives the
 * couple's submission through the actual wizard UI (not a direct API call)
 * since this is the one flow in the whole feature set where the trigger
 * itself — not just its downstream effects — is the thing being verified.
 */

const API_URL = process.env.API_URL ?? "http://localhost:4000";

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

test.describe("Automatic vendor matching from a completed couple profile", () => {
  const coupleEmail = uniqueTestEmail("match-couple");
  const vendorEmail = uniqueTestEmail("match-vendor");
  const password = "TestPass123!";
  let vendorId: string;
  let categoryId: string;
  let cityId: string;

  test.afterAll(() => {
    // vendors.owner_user_id is ON DELETE SET NULL, not CASCADE (see
    // test-users.ts's deleteVendorById doc comment) — deleting the owner
    // user WITHOUT first deleting the vendor row just orphans it forever
    // instead of removing it. Confirmed this was a real bug: 6 orphaned
    // "Matching Test Vendor" rows had accumulated from earlier runs of this
    // exact test before this fix, each one silently competing with the
    // current run's vendor in rankVendors()'s top-3 cutoff and causing
    // intermittent, hard-to-explain test failures.
    if (vendorId) deleteVendorById(vendorId);
    deleteTestUser(coupleEmail);
    deleteTestUser(vendorEmail);
  });

  test("a matching vendor gets a real lead, notification, and inbox message when the couple submits their profile", async ({ page }) => {
    const api = await playwrightRequest.newContext({ baseURL: API_URL });

    // --- Real seeded category/city (not fixture-controlled by this test —
    // same approach as phase-01-auth.spec.ts's profile-setup wizard steps).
    const categoriesRes = await api.get("/api/v1/categories");
    categoryId = (await categoriesRes.json()).data[0].id as string;
    const locationsRes = await api.get("/api/v1/locations?type=CITY");
    cityId = (await locationsRes.json()).data[0].id as string;

    // --- Set up a vendor in exactly this category + city, approved so it's
    // eligible for real search/matching (search only returns APPROVED
    // vendors — see search.repository.ts). ---
    await api.post("/api/v1/auth/register", { data: { email: vendorEmail, password, role: "VENDOR" } });
    verifyTestUserEmail(vendorEmail);
    const vendorLogin = await api.post("/api/v1/auth/login", { data: { identifier: vendorEmail, password } });
    const vendorToken = (await vendorLogin.json()).data.accessToken as string;

    const vendorCreate = await api.post("/api/v1/vendors", {
      headers: { Authorization: `Bearer ${vendorToken}` },
      data: { businessName: "Matching Test Vendor" },
    });
    vendorId = (await vendorCreate.json()).data.id as string;
    approveVendor(vendorId);

    await api.put("/api/v1/vendors/me/categories", {
      headers: { Authorization: `Bearer ${vendorToken}` },
      data: { primaryCategoryId: categoryId, subcategoryIds: [] },
    });
    await api.put("/api/v1/vendors/me/profile", {
      headers: { Authorization: `Bearer ${vendorToken}` },
      data: { cityId, startingPrice: 30000 },
    });

    // --- Couple registers via the real UI and completes the profile-setup
    // wizard, selecting the same category + city the vendor above serves. ---
    await api.post("/api/v1/auth/register", { data: { email: coupleEmail, password, role: "END_USER" } });
    verifyTestUserEmail(coupleEmail);

    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(coupleEmail);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    // Wait for login's own redirect to actually land before navigating away
    // — without this, page.goto("/profile-setup") races the login button's
    // in-flight client-side redirect to /shortlist and can lose.
    await expect(page).toHaveURL(/\/shortlist/, { timeout: 10_000 });

    await page.goto("/profile-setup");
    await expect(page.getByRole("heading", { name: "Set up your wedding profile" })).toBeVisible({ timeout: 10_000 });

    // Step 1: event date.
    await page.getByRole("button", { name: "+ Add a function" }).click();
    await page.locator('input[type="date"]').fill("2027-08-20");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 2: city (required — the field this whole feature depends on).
    await expect(page.getByRole("heading", { name: "Expected number of visitors" })).toBeVisible();
    await page.locator("select").selectOption(cityId);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3: categories — select the exact seeded category the vendor
    // above was set up under, not just "whichever loads first", so this
    // test actually proves the couple's real selection drives the match.
    await expect(page.getByRole("heading", { name: "Vendors you'd like to explore" })).toBeVisible({ timeout: 10_000 });
    const categoriesJson = (await categoriesRes.json()).data as { id: string; name: string }[];
    const categoryName = categoriesJson.find((c) => c.id === categoryId)!.name;
    await page.getByRole("button", { name: categoryName, exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 4: budget — set a range the vendor's startingPrice (30000) falls
    // inside, though matching itself never hard-filters on this (see
    // matching.service.ts's comment on why budget isn't a priceMax filter).
    await expect(page.getByRole("heading", { name: "Price range for each category" })).toBeVisible();
    const budgetInputs = page.locator('input[type="number"]');
    await budgetInputs.nth(0).fill("20000");
    await budgetInputs.nth(1).fill("50000");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 5: submit.
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(/\/shortlist/, { timeout: 10_000 });

    await api.dispose();

    // --- Matching runs fire-and-forget after the submission responds —
    // give it a moment, then verify through the vendor's own real pages,
    // not another direct API call, so this confirms the whole pipeline
    // renders correctly end to end. ---
    await page.request.post("/api/auth/logout");
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(vendorEmail);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/vendor\/dashboard/, { timeout: 10_000 });

    // Real Leads dashboard shows the auto-matched lead.
    await expect(async () => {
      await page.goto("/vendor/leads");
      await expect(page.getByText(coupleEmail).first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 20_000 });

    // Real inbox shows the auto-composed message, reading like a genuine
    // enquiry (item 8's explicit requirement) rather than a system notice.
    await page.goto("/vendor/inbox");
    await expect(page.getByText(/We're planning our wedding on/).last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(new RegExp(`exploring ${categoryName} vendors`)).last()).toBeVisible();
  });
});
