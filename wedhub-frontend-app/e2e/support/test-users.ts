import { execFileSync } from "node:child_process";

/**
 * Creates and cleans up real test accounts against the live backend + Postgres
 * — no mocking, matching the project's verification standard (see
 * frontenddocs/01-reference-cross-cutting.md). Every spec that registers a
 * user must call deleteTestUser() in an afterEach/afterAll so no test data
 * is left in the dev database.
 */

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export function uniqueTestEmail(label: string): string {
  return `e2e-${label}-${Date.now()}@wedhub.dev`;
}

export async function registerTestUser(email: string, password: string, role: "END_USER" | "VENDOR") {
  const response = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to register test user ${email}: ${response.status} ${body}`);
  }
}

function runPsql(sql: string): void {
  execFileSync(
    "psql",
    ["-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev", "-c", sql],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}

/**
 * Registers a normal user, flips it to ADMIN (registerSchema only allows
 * END_USER/VENDOR — there is no self-service admin signup), and links it
 * to the seeded "admin" Role via a real AdminUser row. authorize() now
 * requires that link with at least one permission in addition to
 * User.role === ADMIN (docs/bugs.md #2, 2026-09-04) — an admin missing it
 * 403s on every real admin page via app/(admin)/error.tsx instead of
 * showing data. Was previously duplicated (minus the AdminUser insert,
 * which is why they broke) across phase-08/09/10's own spec files;
 * consolidated here 2026-09-04 after fixing all three the same way once.
 */
export async function createAdminUser(email: string, password: string): Promise<void> {
  await registerTestUser(email, password, "END_USER");
  runPsql(`UPDATE users SET role = 'ADMIN' WHERE email = '${email}';`);
  runPsql(
    `INSERT INTO admin_users (user_id, role_id, updated_at) SELECT id, (SELECT id FROM roles WHERE name = 'admin'), now() FROM users WHERE email = '${email}';`,
  );
}

/**
 * Deletes a test user directly via psql — mirrors the manual cleanup already
 * used during Frontend Arch Phase 0/1 verification. Requires PGPASSWORD/psql
 * to be available on PATH and pointed at the same dev DB the backend uses
 * (see wedhub-backend/.env's DATABASE_URL for the connection details this
 * assumes: localhost:5433, db wedhub_dev, user wedhub).
 */
export function deleteTestUser(email: string): void {
  execFileSync(
    "psql",
    ["-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev", "-c", `DELETE FROM users WHERE email = '${email}';`],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}

/**
 * Directly flips a vendor to APPROVED via psql — used by specs (Frontend
 * Arch Phase 6) that need a vendor reachable by the real
 * POST /enquiries/single-vendor (which requires status === "APPROVED",
 * see wedhub-backend/src/modules/enquiries/enquiry.service.ts) without
 * scripting the full admin-review UI, which doesn't exist yet.
 */
export function approveVendor(vendorId: string): void {
  execFileSync(
    "psql",
    [
      "-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev",
      "-c", `UPDATE vendors SET status = 'APPROVED', approved_at = now() WHERE id = '${vendorId}';`,
    ],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}

/**
 * Deletes a vendor row by exact business name, and everything that
 * cascades from it (status history, invitations — vendor_invitations.
 * vendor_id is ON DELETE CASCADE). Needed by any spec that creates a
 * vendor without ever capturing its id (e.g. admin-create-vendor flows
 * that only navigate via a "View vendor" button) — deleteTestUser() alone
 * can't clean these up, and in the invitation case, deleting the inviting
 * admin BEFORE the vendor fails outright: vendor_invitations.
 * invited_by_admin_id is ON DELETE RESTRICT, so this must run first.
 */
export function deleteVendorByBusinessName(businessName: string): void {
  execFileSync(
    "psql",
    ["-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev", "-c", `DELETE FROM vendors WHERE business_name = '${businessName}';`],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}

/**
 * Deletes a vendor row by id. Needed anywhere a spec calls
 * deleteTestUser(ownerEmail) on a vendor's owner and expects that to also
 * remove the vendor: it doesn't. vendors.owner_user_id is ON DELETE SET
 * NULL, not CASCADE, so deleting the owner just orphans the vendor row
 * forever instead of removing it — confirmed live (docs/bugs.md-adjacent
 * finding, 2026-09-04) after phase-08's own dashboard/approval tests left
 * orphaned "Phase8 Dashboard/Approval Test Vendor" rows behind across
 * multiple runs despite deleteTestUser(ownerEmail) running successfully
 * every time. Call this BEFORE deleting the owner.
 */
export function deleteVendorById(vendorId: string): void {
  execFileSync(
    "psql",
    ["-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev", "-c", `DELETE FROM vendors WHERE id = '${vendorId}';`],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}

/**
 * Deletes a category row by exact name (category_attributes.category_id
 * is ON DELETE CASCADE, so its attributes go with it automatically).
 * Needed by specs that create a category purely through the admin UI form
 * (no API response captured, so there's no id to clean up by) — same
 * "unique per run via Date.now() in the name" pattern as
 * deleteVendorByBusinessName.
 */
export function deleteCategoryByName(name: string): void {
  execFileSync(
    "psql",
    ["-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev", "-c", `DELETE FROM categories WHERE name = '${name}';`],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}

/**
 * Creates a store-enabled category (Category.hasStoreEnabled, see
 * prisma/schema.prisma) and assigns it to the given vendor as their primary
 * category, via psql. Vendor-store eligibility (checkVendorStoreEligibility,
 * wedhub-backend/src/modules/vendor-store/vendor-store.repository.ts) is
 * gated on the vendor having at least one active category with this flag
 * set — there is no self-service UI for a vendor to assign their own
 * category (that's an admin/onboarding-wizard concern orthogonal to the
 * store feature under test here), so this is done directly, the same way
 * approveVendor() substitutes for a not-yet-scripted admin-review UI.
 * Returns the created category's id for cleanup.
 */
export function enableStoreForVendorCategory(vendorId: string, categoryName: string): string {
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const insertCategorySql =
    `INSERT INTO categories (id, name, slug, has_store_enabled, is_active, created_at, updated_at) ` +
    `VALUES (gen_random_uuid(), '${categoryName}', '${slug}', true, true, now(), now()) RETURNING id;`;
  const out = execFileSync(
    "psql",
    ["-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev", "-t", "-A", "-c", insertCategorySql],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  )
    .toString()
    .trim();
  const categoryId = out.split("\n")[0]!.trim();

  execFileSync(
    "psql",
    [
      "-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev",
      "-c",
      `INSERT INTO vendor_categories (vendor_id, category_id, is_primary, created_at) VALUES ('${vendorId}', '${categoryId}', true, now());`,
    ],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );

  return categoryId;
}

/**
 * Directly activates a vendor's VendorPaymentAccount row so the storefront's
 * canVendorAcceptOnlinePayments() gate (vendor-payment.service.ts) passes —
 * used AFTER the vendor has submitted the real bank-connect form through
 * the UI (which always lands the account in PENDING_VERIFICATION, since
 * real Razorpay KYC/penny-drop verification cannot complete instantly even
 * in test mode). This substitutes only for Razorpay's own KYC review time,
 * not for any part of WedHub's own UI — every other step of vendor
 * onboarding in the e2e spec goes through the real dashboard.
 */
export function activateVendorPaymentAccountForTest(vendorId: string): void {
  execFileSync(
    "psql",
    [
      "-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev",
      "-c",
      `UPDATE vendor_payment_accounts SET status = 'ACTIVE', charges_enabled = true, payouts_enabled = true, ` +
        `bank_verification_status = 'VERIFIED', route_activation_status = 'activated', transfer_eligible_at = now() - interval '1 hour' ` +
        `WHERE vendor_id = '${vendorId}';`,
    ],
    { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
  );
}
