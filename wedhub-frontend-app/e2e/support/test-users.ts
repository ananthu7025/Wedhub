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
