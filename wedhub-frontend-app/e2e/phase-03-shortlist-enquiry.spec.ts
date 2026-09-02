import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { uniqueTestEmail, registerTestUser, deleteTestUser } from "./support/test-users";

/**
 * Frontend Arch Phase 3 verification — see frontenddocs/04-stage-couple-experience.md.
 * Exercises the shortlist heart-toggle, /shortlist page, enquiry modal, and
 * /compare page against the live backend, reusing two real APPROVED
 * Photography vendors:
 *  - "Frame & Co. Photography" (slug frame-co-photography, id
 *    485b986b-ccb1-44a2-8733-b3f984f86dc3) — seeded during Frontend Arch
 *    Phase 2, left in the dev database as a fixture.
 *  - "Lens & Light Studios" (slug lens-light-studios, id
 *    c995c538-c337-413e-8b9a-33c3eb3f8e99) — seeded during this phase
 *    specifically so /compare has 2 same-category vendors with visibly
 *    different data (starting price, years experience, photography_style)
 *    to compare, per the backend's real 2-vendor minimum + same-primary-
 *    category validation (GET /comparison/vendors).
 *
 * A fresh END_USER test account is created and deleted per test run. Real
 * backend business rules exercised here (not mocked):
 *  - POST /shortlists/favorites/items is NOT idempotent (409 on duplicate
 *    add) — the heart button's optimistic UI relies on this being handled.
 *  - POST /enquiries/single-vendor has a 15-minute dedupe window keyed on
 *    userId|vendorId|contactEmail|contactPhone|weddingDate|serviceId — so
 *    submitting the exact same enquiry twice in one run would 409. Each
 *    enquiry test uses a distinct message/budget where it matters, and the
 *    suite only submits one real enquiry to avoid tripping this.
 */

const FRAME_CO_VENDOR_ID = "485b986b-ccb1-44a2-8733-b3f984f86dc3";
const LENS_LIGHT_VENDOR_ID = "c995c538-c337-413e-8b9a-33c3eb3f8e99";

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

test.describe("Shortlist heart-toggle and /shortlist page", () => {
  const password = "Phase3Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase3-shortlist");
    await registerTestUser(email, password, "END_USER");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("unauthenticated visitor is redirected to login when tapping the heart", async ({ page }) => {
    await page.goto("/search?keyword=photography");
    const heartButton = page.getByRole("button", { name: "Save to shortlist" }).first();
    await heartButton.click();
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("logged-in couple can favorite a vendor from search, see it on /shortlist, and unfavorite it", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/shortlist$/, { timeout: 15000 });

    await page.goto("/search?keyword=photography");
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();

    const heartButton = page.getByRole("button", { name: "Save to shortlist" }).first();
    await heartButton.click();
    await expect(page.getByRole("button", { name: "Remove from shortlist" }).first()).toBeVisible();

    await page.goto("/shortlist");
    await expect(page.getByRole("heading", { name: "Your shortlist" })).toBeVisible();
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();
    await expect(page.getByText("1 vendor saved")).toBeVisible();

    // Un-favorite from the shortlist grid itself.
    await page.getByRole("button", { name: "Remove from shortlist" }).click();
    await expect(page.getByRole("heading", { name: "No vendors saved yet" })).toBeVisible();
  });
});

test.describe("Enquiry modal", () => {
  const password = "Phase3Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase3-enquiry");
    await registerTestUser(email, password, "END_USER");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("unauthenticated visitor's Send Enquiry link goes to login", async ({ page }) => {
    await page.goto("/vendors/frame-co-photography");
    const link = page.getByRole("link", { name: "Send Enquiry" });
    await expect(link).toHaveAttribute("href", /\/login\?next=/);
  });

  test("logged-in couple can open the enquiry modal, see prefilled contact info, and submit a real enquiry", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/shortlist$/, { timeout: 15000 });

    await page.goto("/vendors/frame-co-photography");
    await page.getByRole("button", { name: "Send Enquiry" }).click();

    await expect(page.getByRole("heading", { name: "Send an enquiry" })).toBeVisible();
    // Contact email prefilled from GET /api/users/me — real profile data, not hardcoded.
    await expect(page.locator('input[type="email"]')).toHaveValue(email);
    // The test account has no profile.firstName/lastName set, so unlike
    // email/phone, the name field can't be prefilled and must be filled here.
    await page.getByLabel("Your name").fill("Test Couple");

    await page.locator('input[type="date"]').fill("2027-03-15");
    await page.locator('input[type="number"]').first().fill("120000");
    await page.locator('input[type="number"]').nth(1).fill("250");
    await page.locator("textarea").fill("We'd love a candid coverage package for our March wedding.");

    await page.getByRole("button", { name: "Submit Enquiry" }).click();
    await expect(page.getByRole("heading", { name: "Enquiry sent!" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(email, { exact: false })).toBeVisible();
  });
});

test.describe("Compare page", () => {
  const password = "Phase3Test!2026";
  let email: string;

  test.beforeEach(async () => {
    email = uniqueTestEmail("phase3-compare");
    await registerTestUser(email, password, "END_USER");
  });

  test.afterEach(async () => {
    deleteTestUser(email);
  });

  test("selecting 2 shortlisted vendors and comparing shows real, distinct data side by side", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/shortlist$/, { timeout: 15000 });

    // Favorite both vendors directly via the real shortlist API — the heart
    // button itself is already covered by the shortlist describe block
    // above; this test's focus is /compare, so seed the shortlist directly.
    await page.request.post("/api/shortlists/favorites/items", { data: { vendorId: FRAME_CO_VENDOR_ID } });
    await page.request.post("/api/shortlists/favorites/items", { data: { vendorId: LENS_LIGHT_VENDOR_ID } });

    await page.goto("/shortlist");
    await expect(page.getByText("2 vendors saved")).toBeVisible();

    // Select both "Compare" checkboxes and go to /compare.
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.getByRole("button", { name: "Compare selected" }).click();

    await expect(page).toHaveURL(/\/compare\?vendorIds=/);
    await expect(page.getByRole("heading", { name: "Compare vendors" })).toBeVisible();
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();
    await expect(page.getByText("Lens & Light Studios")).toBeVisible();

    // Real, distinct data per vendor from GET /comparison/vendors — not
    // hardcoded, and not the same value repeated across columns.
    await expect(page.getByText("₹75,000")).toBeVisible();
    await expect(page.getByText("₹35,000")).toBeVisible();
    await expect(page.getByText("8 years")).toBeVisible();
    await expect(page.getByText("5 years")).toBeVisible();
    await expect(page.getByText("Candid")).toBeVisible();
    await expect(page.getByText("Traditional")).toBeVisible();
  });

  test("visiting /compare directly with a single vendor id shows the real validation message", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/shortlist$/, { timeout: 15000 });

    await page.goto(`/compare?vendorIds=${FRAME_CO_VENDOR_ID}`);
    await expect(page.getByText(/select at least 2 vendors/i)).toBeVisible();
  });
});
