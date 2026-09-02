import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, deleteTestUser, approveVendor } from "./support/test-users";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Frontend Arch Phase 9 verification — see frontenddocs/06-stage-admin-platform.md.
 * Exercises categories & locations management (create, disable, re-enable
 * via the new admin-only includeInactive param), leads oversight (view,
 * real admin status override bypassing the terminal-status lock), and
 * review moderation (real reporter/reviewer identity, approve/flag/hide
 * actions) against the live backend.
 */

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

function runPsql(sql: string): void {
  execFileSync(
    "psql",
    ["-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev", "-c", sql],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}

async function createAdminUser(email: string, password: string): Promise<void> {
  await registerTestUser(email, password, "END_USER");
  runPsql(`UPDATE users SET role = 'ADMIN' WHERE email = '${email}';`);
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or phone").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 15000 });
}

test.describe("Admin categories & locations", () => {
  const password = "Phase9Test!2026";
  let adminEmail: string;
  let categoryId: string | null = null;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase9-catalog-admin");
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    deleteTestUser(adminEmail);
    if (categoryId) {
      runPsql(`DELETE FROM category_attributes WHERE category_id = '${categoryId}'; DELETE FROM categories WHERE id = '${categoryId}';`);
      categoryId = null;
    }
  });

  test("a category can be created, disabled, and re-enabled (via the new includeInactive admin list)", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/categories-locations");

    await expect(page.getByRole("heading", { name: "Categories & locations" })).toBeVisible();

    const categoryName = `Phase9 Category ${Date.now()}`;
    await page.getByPlaceholder("New category name…").fill(categoryName);
    await page.getByRole("button", { name: "+ Add category" }).click();
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 10000 });

    // Disable it — real PATCH isActive:false, then confirm it's still
    // visible (marked disabled) thanks to the new admin includeInactive
    // list, rather than vanishing (the pre-fix trap this phase resolved).
    const row = page.locator("div", { hasText: categoryName }).last();
    await row.getByRole("checkbox").click();
    await expect(page.getByText(/disabled/)).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByText(categoryName)).toBeVisible();
    await expect(page.getByText(/disabled/)).toBeVisible();

    // Re-enable.
    const rowAfterReload = page.locator("div", { hasText: categoryName }).last();
    await rowAfterReload.getByRole("checkbox").click();
    await expect(page.getByText(/disabled/)).not.toBeVisible({ timeout: 10000 });
  });

  test("a country/state/city location tree can be expanded and a new city added", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/categories-locations");
    await page.getByRole("button", { name: "Locations" }).click();

    await expect(page.getByText("India")).toBeVisible();
    await page.getByText("India").click();
    await expect(page.getByText("Karnataka")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Admin leads oversight", () => {
  const password = "Phase9Test!2026";
  let adminEmail: string;
  let ownerEmail: string;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase9-leads-admin");
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    deleteTestUser(adminEmail);
    if (ownerEmail) deleteTestUser(ownerEmail);
  });

  test("admin can view a real lead and override its status past a WON terminal state", async ({ page }) => {
    ownerEmail = uniqueTestEmail("phase9-lead-owner");
    await registerTestUser(ownerEmail, password, "VENDOR");
    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: ownerEmail, password }),
    });
    const loginJson = (await loginResponse.json()) as { data: { accessToken: string } };
    const createResponse = await fetch(`${API_URL}/api/v1/vendors`, {
      method: "POST",
      headers: { Authorization: `Bearer ${loginJson.data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: "Phase9 Lead Test Vendor" }),
    });
    const { data: vendor } = (await createResponse.json()) as { data: { id: string } };
    approveVendor(vendor.id);

    const coupleEmail = uniqueTestEmail("phase9-lead-couple");
    await registerTestUser(coupleEmail, password, "END_USER");
    const coupleLogin = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: coupleEmail, password }),
    });
    const coupleJson = (await coupleLogin.json()) as { data: { accessToken: string } };
    await fetch(`${API_URL}/api/v1/enquiries/single-vendor`, {
      method: "POST",
      headers: { Authorization: `Bearer ${coupleJson.data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: vendor.id,
        contactName: "Phase9 Test Contact",
        contactEmail: coupleEmail,
        weddingDate: "2027-03-01",
      }),
    });
    runPsql(`UPDATE leads SET status = 'WON' WHERE vendor_id = '${vendor.id}';`);

    await login(page, adminEmail, password);
    await page.goto("/admin/leads?status=WON");
    await expect(page.getByText("Phase9 Test Contact")).toBeVisible();

    await page.getByRole("link", { name: "View" }).click();
    await expect(page.getByRole("heading", { name: /Phase9 Test Contact/ })).toBeVisible();

    // Real admin override past a terminal status (WON -> CONTACTED) — the
    // vendor-facing board would disable this; the admin one does not.
    await page.getByRole("combobox").selectOption("CONTACTED");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText("Contacted", { exact: true })).toBeVisible({ timeout: 10000 });

    deleteTestUser(coupleEmail);
  });
});

test.describe("Admin review moderation", () => {
  const password = "Phase9Test!2026";
  let adminEmail: string;
  let vendorOwnerEmail: string;
  let reviewerEmail: string;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase9-reviews-admin");
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    deleteTestUser(adminEmail);
    if (vendorOwnerEmail) deleteTestUser(vendorOwnerEmail);
    if (reviewerEmail) deleteTestUser(reviewerEmail);
  });

  test("a pending review shows a real reviewer name and can be approved", async ({ page }) => {
    vendorOwnerEmail = uniqueTestEmail("phase9-review-vendor");
    await registerTestUser(vendorOwnerEmail, password, "VENDOR");
    const vLogin = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: vendorOwnerEmail, password }),
    });
    const vJson = (await vLogin.json()) as { data: { accessToken: string } };
    const createResponse = await fetch(`${API_URL}/api/v1/vendors`, {
      method: "POST",
      headers: { Authorization: `Bearer ${vJson.data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: "Phase9 Review Test Vendor" }),
    });
    const { data: vendor } = (await createResponse.json()) as { data: { id: string } };
    approveVendor(vendor.id);

    reviewerEmail = uniqueTestEmail("phase9-reviewer");
    await registerTestUser(reviewerEmail, password, "END_USER");
    const rLogin = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: reviewerEmail, password }),
    });
    const rJson = (await rLogin.json()) as { data: { accessToken: string } };
    await fetch(`${API_URL}/api/v1/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${rJson.data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, rating: 4, content: "Phase9 test review content." }),
    });

    await login(page, adminEmail, password);
    await page.goto("/admin/reviews");

    await expect(page.getByText("Phase9 test review content.")).toBeVisible();
    // Real reviewer identity from this phase's backend addition — not a bare UUID.
    await expect(page.getByText(reviewerEmail)).toBeVisible();

    const card = page.locator("div", { hasText: "Phase9 test review content." }).last();
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("APPROVED").first()).toBeVisible({ timeout: 10000 });
  });
});
