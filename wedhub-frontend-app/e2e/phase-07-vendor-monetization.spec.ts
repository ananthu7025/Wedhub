import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, deleteTestUser, approveVendor } from "./support/test-users";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Frontend Arch Phase 7 verification — see frontenddocs/05-stage-vendor-experience.md.
 * Exercises the subscription page (real plan cards from GET /plans, a real
 * trial-eligible upgrade with no payment needed, cancel/undo-cancel),
 * analytics page (real GET /vendors/me/analytics + GET /leads/analytics),
 * and settings page (business info save, a real notification-preference
 * toggle) against the live backend.
 *
 * No real Razorpay checkout is exercised — this dev environment has no
 * test-mode Razorpay credentials (see
 * frontenddocs/10-risks-and-open-questions.md). The PRO plan's real
 * 14-day trial (trialDays: 14 in the seeded plan data) is used instead,
 * since it exercises the exact same POST /subscriptions/me/upgrade
 * endpoint but activates immediately with no payment — real coverage of
 * the endpoint, just not of Checkout.js itself.
 */

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

async function registerVendorAndCreateListing(email: string, password: string, businessName: string): Promise<string> {
  await registerTestUser(email, password, "VENDOR");
  const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginJson = (await loginResponse.json()) as { data: { accessToken: string } };
  const accessToken = loginJson.data.accessToken;

  const createResponse = await fetch(`${API_URL}/api/v1/vendors`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ businessName }),
  });
  const createJson = (await createResponse.json()) as { data: { id: string } };
  const vendorId = createJson.data.id;

  approveVendor(vendorId);

  return vendorId;
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or phone").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/vendor\/dashboard$/, { timeout: 15000 });
}

test.describe("Vendor subscription page", () => {
  const password = "Phase7Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase7-sub-vendor");
    await registerVendorAndCreateListing(email, password, "Phase7 Subscription Studio");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("shows real plan cards, an implicit Free plan, and a real trial upgrade with cancel/undo-cancel", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/vendor/subscription");

    await expect(page.getByRole("heading", { name: "Subscription" })).toBeVisible();
    // Real plan data (see wedhub-backend seed): Free/Pro/Premium monthly cards.
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
    await expect(page.getByText("Pro", { exact: true })).toBeVisible();
    await expect(page.getByText("Premium", { exact: true })).toBeVisible();
    // No Subscription row exists yet — implicit Free is current.
    await expect(page.getByRole("button", { name: "Current plan" })).toBeVisible();

    // Real trial upgrade: POST /subscriptions/me/upgrade returns
    // { subscription, checkout: null } since Pro has trialDays > 0 — no
    // payment/Checkout.js involved, activates immediately.
    await expect(page.getByText("14-day free trial")).toBeVisible();
    await page.getByRole("button", { name: "Upgrade to Pro" }).click();

    await expect(page.getByText("TRIALING")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Pro — ₹5,999\/month/)).toBeVisible();

    // Real cancel (cancelAtPeriodEnd: true) and undo-cancel, both round-tripping
    // through the backend and reflected without a page reload.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Cancel subscription" }).click();
    await expect(page.getByText(/will end on/)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Undo cancellation" }).click();
    await expect(page.getByRole("button", { name: "Cancel subscription" })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Vendor analytics page", () => {
  const password = "Phase7Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase7-analytics-vendor");
    await registerVendorAndCreateListing(email, password, "Phase7 Analytics Studio");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("shows real profile-view/lead/review counts and a real leads funnel", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/vendor/analytics");

    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Profile views", { exact: true })).toBeVisible();
    await expect(page.getByText("Leads received", { exact: true })).toBeVisible();
    await expect(page.getByText("Response rate", { exact: true })).toBeVisible();
    await expect(page.getByText("Conversion rate", { exact: true })).toBeVisible();
    // Fresh vendor, no leads yet, basic tier (Free plan) — real empty/basic states.
    await expect(page.getByText("No leads yet.")).toBeVisible();
    await expect(page.getByText(/available on Pro and Premium plans/)).toBeVisible();
  });
});

test.describe("Vendor settings page", () => {
  const password = "Phase7Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase7-settings-vendor");
    await registerVendorAndCreateListing(email, password, "Phase7 Settings Studio");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("saves real business info and persists a real notification-preference toggle", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/vendor/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    const businessNameInput = page.getByLabel("Business name");
    await businessNameInput.fill("Phase7 Settings Studio (Updated)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByLabel("Business name")).toHaveValue("Phase7 Settings Studio (Updated)");

    // Real PUT /notifications/me/preferences — toggle the first preference
    // off, reload, confirm it persisted (not just optimistic client state).
    const firstToggle = page.locator('input[type="checkbox"]').first();
    await expect(firstToggle).toBeChecked();
    await firstToggle.click({ force: true });
    await expect(firstToggle).not.toBeChecked({ timeout: 10000 });

    await page.reload();
    await expect(page.locator('input[type="checkbox"]').first()).not.toBeChecked();
  });
});
