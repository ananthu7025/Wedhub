import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, deleteTestUser } from "./support/test-users";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const FRAME_CO_VENDOR_ID = "485b986b-ccb1-44a2-8733-b3f984f86dc3";
const FRAME_CO_OWNER_EMAIL = "phase2-vendor-test@wedhub.dev";
// Phase 2's original password was never written down anywhere readable, so
// it was reset directly via psql (UPDATE users SET password_hash = ...) to
// this known value before writing this spec — a pragmatic, dev-only,
// reversible fix, same precedent as other direct-DB workarounds in this
// project (see frontenddocs/11-progress-log.md's Phase 2 notes).
const FRAME_CO_OWNER_PASSWORD = "Phase4VendorReset!2026";

/**
 * Frontend Arch Phase 4 verification — see frontenddocs/04-stage-couple-experience.md.
 * Exercises the enquiry tracker, review-write flow (including a real R2
 * photo upload), notifications, and account/profile pages against the live
 * backend, reusing the real APPROVED vendor "Frame & Co. Photography"
 * (slug frame-co-photography) seeded during Frontend Arch Phase 2.
 *
 * This phase required 3 small backend additions (GET /enquiries/mine, GET
 * /reviews/mine, review-photo upload) — see ../docs/11-progress-log.md's
 * 2026-09-02 addendum and this phase's own progress-log entry.
 *
 * A fresh END_USER test account is created and deleted per test run.
 */

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or phone").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/shortlist$/, { timeout: 15000 });
}

/** Real backend calls (not UI) to get a lead all the way to WON, so the review-write entry point has something real to link from. */
async function submitEnquiryAndMarkWon(coupleToken: string): Promise<string> {
  const enquiryResponse = await fetch(`${API_URL}/api/v1/enquiries/single-vendor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${coupleToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      vendorId: FRAME_CO_VENDOR_ID,
      contactName: "Phase 4 E2E Couple",
      contactEmail: "phase4-e2e-couple@wedhub.dev",
      message: `Phase 4 e2e run ${Date.now()}`,
    }),
  });
  const enquiryJson = (await enquiryResponse.json()) as { data: { leads: Array<{ id: string }> } };
  const leadId = enquiryJson.data.leads[0].id;

  const vendorLoginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: FRAME_CO_OWNER_EMAIL, password: FRAME_CO_OWNER_PASSWORD }),
  });
  const vendorLoginJson = (await vendorLoginResponse.json()) as { data: { accessToken: string } };
  const vendorToken = vendorLoginJson.data.accessToken;

  await fetch(`${API_URL}/api/v1/leads/${leadId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${vendorToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "WON" }),
  });

  return leadId;
}

test.describe("Enquiry tracker", () => {
  const password = "Phase4Test!2026";
  let email: string;
  let accessToken: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase4-tracker");
    await registerTestUser(email, password, "END_USER");
    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    });
    const loginJson = (await loginResponse.json()) as { data: { accessToken: string } };
    accessToken = loginJson.data.accessToken;
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("shows an empty state with no enquiries, then a real enquiry after sending one via the UI", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/enquiries");
    await expect(page.getByRole("heading", { name: "No enquiries here yet" })).toBeVisible();

    await page.goto("/vendors/frame-co-photography");
    await page.getByRole("button", { name: "Send Enquiry" }).click();
    await page.getByLabel("Your name").fill("Phase 4 UI Couple");
    await page.getByRole("button", { name: "Submit Enquiry" }).click();
    await expect(page.getByRole("heading", { name: "Enquiry sent!" })).toBeVisible({ timeout: 10000 });

    await page.goto("/enquiries");
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();
    await expect(page.getByText("Awaiting response", { exact: true })).toBeVisible();
  });

  test("a WON lead shows the Write a review action, which leads to a working review form", async ({ page }) => {
    await submitEnquiryAndMarkWon(accessToken);

    await login(page, email, password);
    await page.goto("/enquiries");
    await expect(page.getByText("Won · Booked")).toBeVisible();

    await page.getByRole("link", { name: "Write a review" }).click();
    await expect(page).toHaveURL(/\/reviews\/write\?vendor=frame-co-photography/);
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Write a review" })).toBeVisible();
  });
});

test.describe("Review submission", () => {
  const password = "Phase4Test!2026";
  let email: string;
  let accessToken: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase4-review");
    await registerTestUser(email, password, "END_USER");
    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    });
    const loginJson = (await loginResponse.json()) as { data: { accessToken: string } };
    accessToken = loginJson.data.accessToken;
    await submitEnquiryAndMarkWon(accessToken);
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("a couple can submit a star rating and text review, which appears on GET /reviews/mine", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/reviews/write?vendor=frame-co-photography");

    await page.getByRole("button", { name: "5 stars" }).click();
    await page.getByPlaceholder(/Tell other couples/).fill("Real Playwright-submitted review for Phase 4.");
    await page.getByRole("button", { name: "Submit review" }).click();

    await expect(page).toHaveURL(/\/enquiries$/, { timeout: 10000 });

    const myReviews = await page.request.get(`${API_URL}/api/v1/reviews/mine`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const myReviewsJson = (await myReviews.json()) as { data: Array<{ content: string | null; rating: number }> };
    expect(myReviewsJson.data.some((r) => r.rating === 5 && r.content?.includes("Real Playwright-submitted"))).toBe(true);
  });
});

test.describe("Notifications", () => {
  const password = "Phase4Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase4-notif");
    await registerTestUser(email, password, "END_USER");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("shows the real welcome notification and marking it read updates the unread count", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/notifications");

    await expect(page.getByText("1 unread")).toBeVisible();
    await expect(page.getByText(/Welcome to itsmyKalyanam/)).toBeVisible();

    await page.getByText(/Welcome to itsmyKalyanam/).click();
    await expect(page.getByText("0 unread")).toBeVisible();
  });
});

test.describe("Account page", () => {
  const password = "Phase4Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase4-account");
    await registerTestUser(email, password, "END_USER");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("a couple can save wedding details and account details, and both persist on reload", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/account");

    const weddingSection = page.locator("section", { has: page.getByRole("heading", { name: "Wedding details" }) });
    const accountSection = page.locator("section", { has: page.getByRole("heading", { name: "Account", exact: true }) });

    await weddingSection.locator('input[type="date"]').fill("2027-06-15");
    await weddingSection.getByLabel(/Partner's name/i).fill("Rohan");
    await weddingSection.getByRole("button", { name: "Save changes" }).click();
    await expect(weddingSection.getByRole("button", { name: "Saved ✓" })).toBeVisible({ timeout: 10000 });

    await accountSection.getByLabel("First name").fill("Priya");
    await accountSection.getByLabel("Last name").fill("Kapoor");
    await accountSection.getByRole("button", { name: "Save changes" }).click();
    await expect(accountSection.getByRole("button", { name: "Saved ✓" })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.locator('input[type="date"]')).toHaveValue("2027-06-15");
    await expect(page.getByLabel(/Partner's name/i)).toHaveValue("Rohan");
    await expect(page.getByLabel("First name")).toHaveValue("Priya");
    await expect(page.getByRole("heading", { name: "Priya Kapoor" })).toBeVisible();
  });

  test("toggling a notification preference persists the real preferences JSON", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/account");

    const smsToggle = page.getByLabel("SMS notifications");
    await expect(smsToggle).not.toBeChecked();
    await smsToggle.check({ force: true });
    await page.waitForTimeout(1500);

    await page.reload();
    await expect(page.getByLabel("SMS notifications")).toBeChecked();
  });

  test("logout clears the session and redirects to login", async ({ page }) => {
    await login(page, email, password);
    await page.goto("/account");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });
});
