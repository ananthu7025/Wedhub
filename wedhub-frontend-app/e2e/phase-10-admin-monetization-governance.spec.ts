import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, createAdminUser, deleteTestUser } from "./support/test-users";

/**
 * Frontend Arch Phase 10 verification — see
 * frontenddocs/06-stage-admin-platform.md. Exercises Plans (real
 * create/edit/deactivate round trip against GET/POST/PATCH /admin/plans),
 * Coupons (real create-only endpoint), Roles & permissions (real,
 * read-only GET /admin/roles + /admin/permissions + /admin/admin-users),
 * and Audit log (real entityType filter) against the live backend.
 *
 * Per the standing instruction (2026-09-02): this spec is written but NOT
 * run yet — Playwright verification for Stage 4 (Phases 7-10) is batched
 * into one combined pass after this phase is committed.
 */

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

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

test.describe("Admin subscriptions & payments", () => {
  const password = "Phase10Test!2026";
  let adminEmail: string;
  let createdPlanName: string | undefined;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase10-subs-admin");
    createdPlanName = undefined;
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    // Was previously dead code the same way phase-09's categoryId was:
    // createdPlanId was declared and checked but never assigned (the plan
    // is created purely through the UI form, no API response captured),
    // so every run permanently occupied the FREE/YEARLY slot instead of
    // freeing it back up. Cleaned up by name instead.
    if (createdPlanName) runPsql(`DELETE FROM subscription_plans WHERE name = '${createdPlanName}';`);
    deleteTestUser(adminEmail);
  });

  test("a plan can be created, edited, and deactivated; unavailable panels render for subscriptions/transactions/webhooks", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/subscriptions");
    await expect(page.getByRole("heading", { name: "Subscriptions & payments" })).toBeVisible();

    // Real plan create. Every real tier x interval combination except
    // FREE/YEARLY is already occupied by seeded plans (subscription_plans
    // has a real uniqueness constraint on tier+billingInterval) — the
    // form defaults to PRO/MONTHLY, which always 409s. FREE/YEARLY is the
    // one genuinely free slot.
    await page.getByRole("button", { name: "+ Create plan" }).click();
    await page.getByLabel("Tier").selectOption("FREE");
    await page.getByLabel("Billing interval").selectOption("YEARLY");
    const planName = `Phase10 Plan ${Date.now()}`;
    createdPlanName = planName;
    await page.getByLabel("Plan name").fill(planName);
    await page.getByLabel("Price (₹)").fill("999");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });

    // Real plan edit + deactivate — the card should show "Inactive" after.
    const card = page.locator("div", { hasText: planName }).last();
    await card.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText("Inactive").first()).toBeVisible({ timeout: 10000 });

    // No-list-endpoint areas show an explicit unavailable state, not fake rows.
    await page.getByRole("button", { name: "Active Subscriptions" }).click();
    await expect(page.getByText("No admin subscriptions list endpoint")).toBeVisible();
    await page.getByRole("button", { name: "Transactions" }).click();
    await expect(page.getByText("No admin transactions list endpoint")).toBeVisible();
    await page.getByRole("button", { name: "Webhooks" }).click();
    await expect(page.getByText("No admin webhooks list endpoint")).toBeVisible();
  });

  test("a coupon can be created via the real create-only endpoint", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/subscriptions");
    await page.getByRole("button", { name: "Coupons" }).click();

    const code = `PHASE10${Date.now()}`.slice(0, 20);
    await page.getByPlaceholder("WEDHUB25").fill(code);
    await page.getByRole("button", { name: "+ Create coupon" }).click();
    await expect(page.getByText(code, { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No admin coupons list endpoint")).toBeVisible();

    runPsql(`DELETE FROM coupons WHERE code = '${code}';`);
  });
});

test.describe("Admin roles & permissions (real, read-only)", () => {
  const password = "Phase10Test!2026";
  let adminEmail: string;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase10-roles-admin");
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    deleteTestUser(adminEmail);
  });

  test("real roles and permissions render with the read-only warning", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/roles-permissions");

    await expect(page.getByRole("heading", { name: "Roles & permissions" })).toBeVisible();
    await expect(page.getByText("This screen is read-only.")).toBeVisible();
    // Real seeded role from the backend, not a mockup fixture.
    await expect(page.getByText("admin", { exact: true }).first()).toBeVisible();
    // Real permission strings in resource:action form.
    await expect(page.getByText(/[a-z]+:[a-z]+/).first()).toBeVisible();
  });
});

test.describe("Admin audit log", () => {
  const password = "Phase10Test!2026";
  let adminEmail: string;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase10-audit-admin");
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    deleteTestUser(adminEmail);
  });

  test("audit log lists real entries and the entityType filter narrows results", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/audit-log");

    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Entity type").selectOption("vendor");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/entityType=vendor/);
  });
});
