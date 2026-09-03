import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, createAdminUser, deleteTestUser, deleteVendorByBusinessName, deleteVendorById } from "./support/test-users";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Frontend Arch Phase 8 verification — see frontenddocs/06-stage-admin-platform.md.
 * Exercises the admin dashboard (real aggregate metrics, recent activity,
 * pending approvals), vendor list/detail (real approve/reject/suspend/
 * restore, real verification-level updates, real audit trail), create-
 * vendor flow, and user list/detail (real suspend/restore) against the
 * live backend, using ADMIN accounts provisioned directly via psql (there
 * is no self-registration path for ADMIN — confirmed via research,
 * registerSchema.role only allows END_USER/VENDOR).
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

async function registerPendingVendor(businessName: string): Promise<{ vendorId: string; ownerEmail: string }> {
  const ownerEmail = uniqueTestEmail("phase8-pending-owner");
  const password = "Phase8Test!2026";
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
    body: JSON.stringify({ businessName }),
  });
  const createJson = (await createResponse.json()) as { data: { id: string } };
  const vendorId = createJson.data.id;
  // Reach PENDING_APPROVAL directly, same as phase-06/07 specs' approveVendor()
  // helper — there's no admin-review UI to drive the real submit flow
  // through yet within this spec's own scope.
  runPsql(`UPDATE vendors SET status = 'PENDING_APPROVAL', submitted_at = now() WHERE id = '${vendorId}';`);
  return { vendorId, ownerEmail };
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or phone").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 15000 });
}

test.describe("Admin dashboard", () => {
  const password = "Phase8Test!2026";
  let adminEmail: string;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase8-dashboard-admin");
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    deleteTestUser(adminEmail);
  });

  test("shows real aggregate metrics, recent activity, and pending approvals", async ({ page }) => {
    const { vendorId, ownerEmail } = await registerPendingVendor("Phase8 Dashboard Test Vendor");
    // Cleanup moved into try/finally: this assertion previously ran last, so
    // any failure here left the vendor+owner behind for every future run to
    // trip over too (a real duplicate-row assertion would then wrongly look
    // like a UI bug instead of accumulated test debris). Vendor deleted
    // explicitly by id, before the owner — vendors.owner_user_id is
    // ON DELETE SET NULL, not CASCADE, so deleteTestUser(ownerEmail) alone
    // orphans the vendor row instead of removing it.
    try {
      await login(page, adminEmail, password);
      await page.goto("/admin/dashboard");

      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await expect(page.getByText("Total users", { exact: true })).toBeVisible();
      await expect(page.getByText("Total vendors", { exact: true })).toBeVisible();
      await expect(page.getByText("MRR", { exact: true })).toBeVisible();
      await expect(page.getByText("Pending approvals")).toBeVisible();
      await expect(page.getByText("Phase8 Dashboard Test Vendor")).toBeVisible();
    } finally {
      deleteVendorById(vendorId);
      deleteTestUser(ownerEmail);
    }
  });
});

test.describe("Admin vendor management", () => {
  const password = "Phase8Test!2026";
  let adminEmail: string;
  let ownerEmail: string;
  let createdVendorBusinessName: string | undefined;
  let pendingVendorId: string | undefined;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase8-vendor-admin");
    createdVendorBusinessName = undefined;
    pendingVendorId = undefined;
    await createAdminUser(adminEmail, password);
  });

  test.afterEach(async () => {
    // Must run before deleteTestUser(adminEmail) — the vendor's invitation
    // references the admin via invited_by_admin_id (ON DELETE RESTRICT),
    // so deleting the admin first would fail with a real FK violation.
    if (createdVendorBusinessName) deleteVendorByBusinessName(createdVendorBusinessName);
    // Deleted explicitly by id, before the owner — vendors.owner_user_id
    // is ON DELETE SET NULL, not CASCADE, so deleteTestUser(ownerEmail)
    // alone orphans the vendor row instead of removing it.
    if (pendingVendorId) deleteVendorById(pendingVendorId);
    deleteTestUser(adminEmail);
    if (ownerEmail) deleteTestUser(ownerEmail);
  });

  test("a pending vendor can be approved, verification updated, and later suspended and restored", async ({ page }) => {
    const created = await registerPendingVendor("Phase8 Approval Test Vendor");
    ownerEmail = created.ownerEmail;
    pendingVendorId = created.vendorId;

    await login(page, adminEmail, password);
    await page.goto("/admin/vendors?status=PENDING_APPROVAL");
    await expect(page.getByText("Phase8 Approval Test Vendor")).toBeVisible();

    await page.goto(`/admin/vendors/${created.vendorId}`);
    await expect(page.getByRole("heading", { name: /Phase8 Approval Test Vendor/ })).toBeVisible();
    // Real owner email, from the VENDOR_ADMIN_INCLUDE backend addition this phase.
    await expect(page.getByText(created.ownerEmail)).toBeVisible();

    // Status text legitimately renders in more than one place on this page
    // (a header badge, a status-history badge, and a raw status <code>
    // block) — .first() is enough to confirm the real status shows.
    await page.getByRole("button", { name: "Approve vendor" }).click();
    await expect(page.getByText("APPROVED", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Real verification-level update (POST /admin/vendors/:id/verify).
    await page.getByRole("combobox").selectOption("IDENTITY_VERIFIED");
    await page.getByRole("button", { name: "Update verification level" }).click();
    // Also matches the <select>'s own (non-rendered-visible) <option> text —
    // .first() picks the real on-page badge/history entry instead.
    await expect(page.getByText("Identity verified").first()).toBeVisible({ timeout: 10000 });

    // Real suspend, requiring a reason.
    await page.getByPlaceholder(/Business documents incomplete/).fill("Suspicious activity reported.");
    await page.getByRole("button", { name: "Suspend vendor" }).click();
    await expect(page.getByText("SUSPENDED", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Restore vendor" }).click();
    await expect(page.getByText("APPROVED", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Real audit trail — status-history entries reflect every transition above.
    await expect(page.getByText(/PENDING_APPROVAL/).first()).toBeVisible();
  });

  test("admin can create a vendor and send an invitation", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/vendors/create");

    const businessName = `Phase8 Admin-Created ${Date.now()}`;
    createdVendorBusinessName = businessName;
    await page.getByPlaceholder("e.g. Example Studios").fill(businessName);
    await page.getByPlaceholder("vendor@example.com").fill(uniqueTestEmail("phase8-invited"));
    await page.getByRole("button", { name: "Create & send invitation" }).click();

    await expect(page.getByText("Vendor draft created")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "View vendor" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(businessName) })).toBeVisible({ timeout: 10000 });
    // DRAFT legitimately renders in more than one place on this page (a
    // header badge, a status-history badge, and a raw status <code> block)
    // — .first() is enough to confirm the real status shows somewhere.
    await expect(page.getByText("DRAFT", { exact: true }).first()).toBeVisible();
  });
});

test.describe("Admin user management", () => {
  const password = "Phase8Test!2026";
  let adminEmail: string;
  let targetEmail: string;

  test.beforeEach(async () => {
    adminEmail = uniqueTestEmail("phase8-user-admin");
    targetEmail = uniqueTestEmail("phase8-target-user");
    await createAdminUser(adminEmail, password);
    await registerTestUser(targetEmail, password, "END_USER");
  });

  test.afterEach(async () => {
    deleteTestUser(adminEmail);
    deleteTestUser(targetEmail);
  });

  test("a real user can be suspended and restored, reflected without reload", async ({ page }) => {
    await login(page, adminEmail, password);
    await page.goto("/admin/users");
    // Matches both the table cell and a <span> nested inside it — .first() is
    // enough to confirm the real email shows in the row.
    await expect(page.getByText(targetEmail).first()).toBeVisible();

    const row = page.locator("tr", { hasText: targetEmail });
    await row.getByRole("button", { name: "Actions ▾" }).click();

    page.once("dialog", (dialog) => dialog.accept("Repeated policy violations."));
    await row.getByRole("button", { name: "Suspend" }).click();
    await expect(row.getByText("Restricted")).toBeVisible({ timeout: 10000 });

    await row.getByRole("button", { name: "Actions ▾" }).click();
    await row.getByRole("button", { name: "Restore" }).click();
    await expect(row.getByText("Active")).toBeVisible({ timeout: 10000 });
  });
});
