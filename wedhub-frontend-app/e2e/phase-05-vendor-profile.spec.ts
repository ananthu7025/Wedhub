import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, deleteTestUser } from "./support/test-users";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Frontend Arch Phase 5 verification — see frontenddocs/05-stage-vendor-experience.md.
 * Exercises the vendor dashboard, profile editor (identity/classification/
 * location/commercial/trust/contact/operational/attributes), portfolio
 * manager (real R2 upload + worker processing + set-as-logo), and package
 * manager against the live backend, using a fresh VENDOR account per test.
 *
 * This phase required 3 small backend additions (logoMediaId/coverMediaId
 * write support on PUT /vendors/me/profile, VENDOR_FULL_INCLUDE joining
 * logoMedia/coverMedia, and services embedded in GET /categories(/:slug)) —
 * see ../docs/11-progress-log.md's 2026-09-02 addendum.
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

  await fetch(`${API_URL}/api/v1/vendors`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ businessName }),
  });

  return accessToken;
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or phone").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  // A VENDOR's roleHomeRoute is intentionally /vendor/dashboard on login
  // (the general landing page) — only signup's own success screen sends a
  // brand-new vendor straight to /vendor/profile, to nudge completing it.
  await expect(page).toHaveURL(/\/vendor\/dashboard$/, { timeout: 15000 });
}

test.describe("Vendor dashboard and profile editor", () => {
  const password = "Phase5Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase5-vendor");
    await registerVendorAndCreateListing(email, password, "Phase5 E2E Studio");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("dashboard shows real analytics, a DRAFT status prompt, and a live completeness checklist", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/vendor/dashboard");

    await expect(page.getByRole("heading", { name: /Welcome back, Phase5/ })).toBeVisible();
    await expect(page.getByText(/DRAFT/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Complete and submit your profile" })).toBeVisible();
    await expect(page.getByText("Business name")).toBeVisible();
    await expect(page.getByText("At least one package")).toBeVisible();
  });

  test("saving the profile editor persists real fields, and submitting for review works end-to-end", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/vendor/profile");

    await page.getByLabel("Short description").fill("Playwright E2E test studio — candid wedding photography.");
    await page.getByLabel("Full description").fill(
      "A full description written by the Phase 5 headed Playwright run, long enough to satisfy the real backend's submission requirements.",
    );
    await page.getByLabel("City").selectOption({ label: "Bengaluru" });
    await page.getByLabel("Phone").fill("+919900011122");

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByLabel("Short description")).toHaveValue(/candid wedding photography/);
    await expect(page.getByLabel("City")).toHaveValue(/./);

    // Attach a service (required for submission) and add a package via the
    // real packages page, then come back and submit.
    const servicesCheckbox = page.locator('input[type="checkbox"]').first();
    if (await servicesCheckbox.count() > 0) {
      await servicesCheckbox.check();
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible({ timeout: 10000 });
    }

    await page.goto("/vendor/packages");
    // Two "+ Add package" buttons exist when the list is empty (header +
    // empty-state CTA) — both do the same thing, .first() is deliberate.
    await page.getByRole("button", { name: "+ Add package" }).first().click();
    await page.getByPlaceholder("e.g. Signature").fill("Essential");
    await page.getByPlaceholder("e.g. 75000").fill("60000");
    await page.getByRole("button", { name: "Save package" }).click();
    await expect(page.getByText("Essential")).toBeVisible();
    await expect(page.getByText("₹60,000")).toBeVisible();

    await page.goto("/vendor/profile");
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page).toHaveURL(/\/vendor\/dashboard$/, { timeout: 10000 });
    await expect(page.getByText(/PENDING VERIFICATION|PENDING_VERIFICATION/i)).toBeVisible();
  });
});

test.describe("Portfolio manager", () => {
  const password = "Phase5Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase5-portfolio");
    await registerVendorAndCreateListing(email, password, "Phase5 Portfolio Studio");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("uploading a real photo shows a processing state then a real image, and it can be set as logo", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/vendor/portfolio");

    await expect(page.getByText("No photos or videos yet")).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "e2e-test-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(
        "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda000c03010002110311003f00f7fa28a2803fffd9",
        "hex",
      ),
    });

    // Real presigned-R2 upload + confirm — the item appears as PROCESSING
    // then transitions to READY once the real media-processing worker
    // finishes (sharp-based resize to webp variants), not a simulated timer.
    await expect(page.getByText(/processing|pending/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("div.group img").first()).toBeVisible({ timeout: 45000 });

    await page.locator("div.group").first().hover();
    await page.getByRole("button", { name: "Set as logo" }).click();
    await expect(page.getByText("Logo", { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });
});
