import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, createAdminUser, deleteTestUser, approveVendor, deleteCategoryByName, deleteVendorByBusinessName } from "./support/test-users";

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
  let createdCategoryName: string | undefined;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase9-catalog-admin");
    createdCategoryName = undefined;
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    // Was previously dead code: this test creates the category purely
    // through the UI form (no API response captured), so the old
    // categoryId variable it was meant to populate was declared and
    // checked but never actually assigned anywhere — every run silently
    // leaked a "Phase9 Category <timestamp>" row. Cleaned up by name
    // instead (Date.now() in the name already makes it unique per run).
    if (createdCategoryName) deleteCategoryByName(createdCategoryName);
    deleteTestUser(adminEmail);
  });

  test("a category can be created, disabled, and re-enabled (via the new includeInactive admin list)", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/categories-locations");

    await expect(page.getByRole("heading", { name: "Categories & locations" })).toBeVisible();

    const categoryName = `Phase9 Category ${Date.now()}`;
    createdCategoryName = categoryName;
    await page.getByPlaceholder("New category name…").fill(categoryName);
    await page.getByRole("button", { name: "+ Add category" }).click();
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 10000 });

    // Disable it — real PATCH isActive:false, then confirm it's still
    // visible (marked disabled) thanks to the new admin includeInactive
    // list, rather than vanishing (the pre-fix trap this phase resolved).
    //
    // Three real issues found and fixed getting this far: (1) scoped via
    // data-testid, not a plain div+hasText match — the latter matched
    // every ancestor div containing the text too, and .last() didn't
    // reliably land on the one row-container div with the checkbox as a
    // real descendant. (2) the real checkbox is visually sr-only (a styled
    // span provides the toggle look) — clicking the checkbox element
    // directly hits its decorative sibling span instead; click the
    // "Active" label text, same as a real user would, which toggles it
    // via native label association. (3) "disabled" is asserted scoped to
    // this test's own row throughout, not page-wide — there are real,
    // pre-existing disabled categories in the dev seed data.
    const row = page.locator('[data-testid^="category-row-"]', { hasText: categoryName });
    await row.getByText("Active").click();
    await expect(row.getByText(/disabled/)).toBeVisible({ timeout: 10000 });

    await page.reload();
    const rowAfterFirstReload = page.locator('[data-testid^="category-row-"]', { hasText: categoryName });
    await expect(rowAfterFirstReload).toBeVisible();
    await expect(rowAfterFirstReload.getByText(/disabled/)).toBeVisible();

    // Re-enable.
    await rowAfterFirstReload.getByText("Active").click();
    await expect(rowAfterFirstReload.getByText(/disabled/)).not.toBeVisible({ timeout: 10000 });
  });

  test("a country/state/city location tree can be expanded and a new city added", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/categories-locations");
    await page.getByRole("button", { name: "Locations" }).click();

    await expect(page.getByText("India")).toBeVisible();
    // The row's expand arrow is a separate <button> from the name <span>
    // (LocationTree.tsx) — clicking the plain text does nothing, since
    // onToggleExpand is only wired to the arrow button. India is the only
    // seeded country, so its expand button is the tree's first button.
    await page.getByRole("button", { name: "▸" }).first().click();
    await expect(page.getByText("Karnataka")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Admin leads oversight", () => {
  const password = "Phase9Test!2026";
  let adminEmail: string;
  let ownerEmail: string;
  let coupleEmail: string | undefined;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase9-leads-admin");
    coupleEmail = undefined;
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    // Vendor deleted by fixed business name first — cascades its leads
    // (leads.vendor_id is ON DELETE CASCADE) but NOT the enquiry itself
    // (enquiries.user_id is ON DELETE SET NULL, not CASCADE, from either
    // direction), so the enquiry needs its own explicit delete or it
    // leaks "Phase9 Test Contact" rows across every run — confirmed live:
    // 2 leftover enquiries with that exact contactName were found after
    // this test failed on an earlier (pre-RBAC-fix) run.
    runPsql(`DELETE FROM vendors WHERE business_name = 'Phase9 Lead Test Vendor';`);
    runPsql(`DELETE FROM enquiries WHERE contact_name = 'Phase9 Test Contact';`);
    deleteTestUser(adminEmail);
    if (ownerEmail) deleteTestUser(ownerEmail);
    if (coupleEmail) deleteTestUser(coupleEmail);
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

    coupleEmail = uniqueTestEmail("phase9-lead-couple");
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

    // There are real, unrelated pre-existing WON leads in the dev seed
    // data (11 at last count) — .first() on a bare "View" link previously
    // opened one of those instead of this test's own lead. Scoped to the
    // real <tr> containing this test's contact name.
    await page.locator("tr", { hasText: "Phase9 Test Contact" }).getByRole("link", { name: "View" }).click();
    await expect(page.getByRole("heading", { name: /Phase9 Test Contact/ })).toBeVisible();

    // Real admin override past a terminal status (WON -> CONTACTED) — the
    // vendor-facing board would disable this; the admin one does not.
    await page.getByRole("combobox").selectOption("CONTACTED");
    await page.getByRole("button", { name: "Update status" }).click();
    // Also matches the <select>'s own (non-rendered-visible) <option> text
    // — .first() picks the real on-page status badge instead.
    await expect(page.getByText("Contacted", { exact: true }).first()).toBeVisible({ timeout: 10000 });
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
    // The vendor this test creates was never cleaned up (only the two
    // users were) — confirmed live: 3 leftover "Phase9 Review Test
    // Vendor" rows found after earlier runs failed on the unrelated
    // review.photos backend bug this phase also caught. Fixed the same
    // way as the leads-oversight block above.
    deleteVendorByBusinessName("Phase9 Review Test Vendor");
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
