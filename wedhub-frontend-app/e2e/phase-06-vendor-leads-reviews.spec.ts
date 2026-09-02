import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, deleteTestUser, approveVendor } from "./support/test-users";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Frontend Arch Phase 6 verification — see frontenddocs/05-stage-vendor-experience.md.
 * Exercises the vendor leads board (master-detail, status update, internal
 * notes) and reviews page (rating summary, respond) against the live
 * backend. Both /leads/* and the enquiry->lead pipeline require an APPROVED
 * vendor (POST /enquiries/single-vendor 404s on non-APPROVED vendors,
 * confirmed by reading enquiry.service.ts) — there's no admin-review UI
 * yet, so this spec flips the vendor to APPROVED directly via psql
 * (approveVendor helper), the same "reach past a missing admin UI" pattern
 * deleteTestUser already established for direct DB access.
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

async function submitEnquiry(
  vendorId: string,
  coupleAccessToken: string,
  contactName: string,
  contactEmail: string,
): Promise<void> {
  await fetch(`${API_URL}/api/v1/enquiries/single-vendor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${coupleAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      vendorId,
      contactName,
      contactEmail,
      contactPhone: "+919845621309",
      weddingDate: "2027-01-22",
      weddingLocation: "Resort near Nandi Hills",
      budget: 150000,
      guestCount: 270,
      message: "Hi, we'd love a quote for full-day coverage with a second shooter.",
    }),
  });
}

async function registerCoupleAndGetToken(email: string, password: string): Promise<string> {
  await registerTestUser(email, password, "END_USER");
  const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginJson = (await loginResponse.json()) as { data: { accessToken: string } };
  return loginJson.data.accessToken;
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or phone").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/vendor\/dashboard$/, { timeout: 15000 });
}

test.describe("Vendor leads board", () => {
  const password = "Phase6Test!2026";
  let vendorEmail: string;
  let coupleEmail: string;

  test.beforeEach(async () => {
    vendorEmail = uniqueTestEmail("phase6-lead-vendor");
    coupleEmail = uniqueTestEmail("phase6-lead-couple");
  });

  test.afterEach(async () => {
    deleteTestUser(vendorEmail);
    deleteTestUser(coupleEmail);
  });

  test("a real enquiry shows up as a lead, and status + notes can be updated end-to-end", async ({ page }) => {
    const vendorId = await registerVendorAndCreateListing(vendorEmail, password, "Phase6 Lead Studio");
    const coupleToken = await registerCoupleAndGetToken(coupleEmail, password);
    await submitEnquiry(vendorId, coupleToken, "Priya Nair", coupleEmail);

    await login(page, vendorEmail, password);
    await page.goto("/vendor/leads");

    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
    await expect(page.getByText("Priya Nair")).toBeVisible();
    await expect(page.getByText(/New \(1\)/)).toBeVisible();

    // Selecting the lead loads the real detail (enquiry message, contact
    // info) via GET /leads/:id.
    await page.getByText("Priya Nair").first().click();
    await expect(page.getByText(coupleEmail)).toBeVisible();
    await expect(page.getByText(/full-day coverage with a second shooter/)).toBeVisible();

    // Real status transition (PATCH /leads/:id/status) — the button
    // disables itself once statusDraft === detail.status, which only
    // happens after the real PATCH response lands.
    await page.getByRole("combobox").selectOption("CONTACTED");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByRole("button", { name: "Update status" })).toBeDisabled({ timeout: 10000 });
    // The list row badge should reflect the change too.
    await expect(page.locator("button", { hasText: "Priya Nair" }).getByText("Contacted")).toBeVisible({ timeout: 10000 });

    // Real internal note (POST /leads/:id/notes).
    await page.getByPlaceholder("Add a note about this lead…").fill("Spoke on call, sending quote by Thursday.");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByText("Spoke on call, sending quote by Thursday.")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Vendor reviews page", () => {
  const password = "Phase6Test!2026";
  let vendorEmail: string;
  let coupleEmail: string;

  test.beforeEach(async () => {
    vendorEmail = uniqueTestEmail("phase6-review-vendor");
    coupleEmail = uniqueTestEmail("phase6-review-couple");
  });

  test.afterEach(async () => {
    deleteTestUser(vendorEmail);
    deleteTestUser(coupleEmail);
  });

  test("a real approved review shows with rating summary, and vendor can respond", async ({ page }) => {
    const vendorId = await registerVendorAndCreateListing(vendorEmail, password, "Phase6 Review Studio");
    const coupleToken = await registerCoupleAndGetToken(coupleEmail, password);
    // A review requires the reviewer to have at least one lead with the
    // vendor (hasAnyLeadWithVendor, review.repository.ts) — submit one first.
    await submitEnquiry(vendorId, coupleToken, "Rohan Mehta", coupleEmail);

    const reviewResponse = await fetch(`${API_URL}/api/v1/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${coupleToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId,
        rating: 5,
        title: "Absolutely wonderful!",
        content: "The team captured every candid moment beautifully.",
        eventDate: "2027-01-22",
      }),
    });
    const reviewJson = (await reviewResponse.json()) as { data: { id: string } };

    // Reviews default to PENDING — approve directly the same way the vendor
    // gets APPROVED above, since there's no admin-moderation UI yet either.
    const { execFileSync } = await import("node:child_process");
    execFileSync(
      "psql",
      [
        "-h", "localhost", "-p", "5433", "-U", "wedhub", "-d", "wedhub_dev",
        "-c",
        `UPDATE reviews SET status = 'APPROVED' WHERE id = '${reviewJson.data.id}';
         UPDATE vendors SET average_rating = 5, review_count = 1 WHERE id = '${vendorId}';`,
      ],
      { env: { ...process.env, PGPASSWORD: "wedhub_dev_password" }, stdio: "pipe" },
    );

    await login(page, vendorEmail, password);
    await page.goto("/vendor/reviews");

    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    await expect(page.getByText("5.0")).toBeVisible();
    await expect(page.getByText("Absolutely wonderful!")).toBeVisible();
    await expect(page.getByText(/★★★★★/)).toBeVisible();
    await expect(page.getByText("✓ Verified booking")).toBeVisible();

    // Real respond flow (POST /reviews/:id/respond).
    await page.getByRole("button", { name: "Respond" }).click();
    await page.getByPlaceholder("Write a reply to this review…").fill("Thank you so much, it was a pleasure working with you!");
    await page.getByRole("button", { name: "Post reply" }).click();

    await expect(page.getByText(`Response from Phase6 Review Studio`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Thank you so much, it was a pleasure working with you!")).toBeVisible();
  });
});
