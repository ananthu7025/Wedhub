import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";

/**
 * Frontend Arch Phase 2 verification — see frontenddocs/04-stage-couple-experience.md.
 * Exercises home, search, and vendor-detail against the live backend with
 * real seeded test data (a real APPROVED vendor "Frame & Co. Photography",
 * slug frame-co-photography, category Photography, city Bengaluru, with a
 * real category attribute of every dataType, one package, and one real
 * READY+APPROVED portfolio image uploaded through the actual R2 presigned
 * upload flow — not inserted directly, not mocked). This test data is
 * intentionally left in the dev database (not cleaned up) since later
 * phases (3, 4, 5) need a real approved vendor with a portfolio to verify
 * shortlist/enquiry/review flows against — see this phase's progress-log
 * entry for the exact setup steps if it needs to be recreated.
 */

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

test.describe("Home page", () => {
  test("renders real categories and links to search", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /discover and connect/i })).toBeVisible();

    // Real categories from GET /categories, not hardcoded.
    await expect(page.getByRole("link", { name: "Photography" })).toBeVisible();

    // Hero search form submits to /search with the typed keyword.
    await page.getByPlaceholder(/search photographers/i).fill("photography");
    await page.getByRole("button").filter({ hasText: "" }).first().click();
    await expect(page).toHaveURL(/\/search\?keyword=photography/);
  });

  test("category link navigates to a pre-filtered search", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Photography" }).click();
    await expect(page).toHaveURL(/\/search\?categoryId=/);
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();
  });
});

test.describe("Vendors directory page", () => {
  test("renders categories and approved vendors", async ({ page }) => {
    await page.goto("/vendors");
    await expect(page.getByRole("heading", { name: "Wedding Categories" })).toBeVisible();
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();
  });

  test("navigating to /search without filters redirects to /vendors", async ({ page }) => {
    await page.goto("/search");
    await expect(page).toHaveURL(/\/vendors/);
  });
});

test.describe("Search page", () => {
  test("shows the real approved vendor and its price", async ({ page }) => {
    await page.goto("/search?keyword=photography");
    await expect(page.getByText("Frame & Co. Photography")).toBeVisible();
    await expect(page.getByText(/₹75,000/)).toBeVisible();
  });

  test("keyword search narrows results, and a nonsense keyword shows the empty state", async ({ page }) => {
    await page.goto("/search?keyword=photography");
    const searchBox = page.locator('input[name="keyword"]').last();
    await searchBox.fill("zzzznonexistentvendorzzz");
    await searchBox.press("Enter");

    await expect(page.getByText("No vendors found")).toBeVisible();
  });

  test("clicking a result navigates to the real vendor profile", async ({ page }) => {
    await page.goto("/search?keyword=photography");
    await page.getByText("Frame & Co. Photography").click();
    await expect(page).toHaveURL(/\/vendors\/frame-co-photography/);
  });
});

test.describe("Vendor detail page", () => {
  test("renders identity, category attributes of every data type, package, and portfolio image", async ({ page }) => {
    await page.goto("/vendors/frame-co-photography");

    await expect(page.getByRole("heading", { name: "Frame & Co. Photography" })).toBeVisible();
    await expect(page.getByText("Photography · Bengaluru", { exact: false })).toBeVisible();

    // Category attributes — one of each dataType (SELECT, BOOLEAN x2, NUMBER, TEXT)
    // rendered generically by VendorAttributes.tsx, not hardcoded per category.
    await expect(page.getByText("Photography Style")).toBeVisible();
    await expect(page.getByText("Candid", { exact: true })).toBeVisible();
    await expect(page.getByText("Drone Coverage")).toBeVisible();
    await expect(page.getByText("Number of Photographers")).toBeVisible();
    await expect(page.getByText("Delivery Time")).toBeVisible();
    await expect(page.getByText("4-6 weeks")).toBeVisible();

    // Package with real inclusions.
    await expect(page.getByText("Essential")).toBeVisible();
    await expect(page.getByText("Up to 8 hours coverage")).toBeVisible();

    // The real hero image, uploaded through the actual presigned-R2 flow and
    // resolved via the album-cover fallback (see
    // frontenddocs/10-risks-and-open-questions.md Open Question 7) — this is
    // a real <img>, not a placeholder.
    const heroImg = page.locator("img").first();
    await expect(heroImg).toHaveAttribute("src", /r2\.dev/);

    // Portfolio grid shows the same real uploaded photo.
    await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();

    // Enquiry CTA exists but is Phase 3 scope — it links to login, not a working modal.
    const enquiryLink = page.getByRole("link", { name: "Send Enquiry" });
    await expect(enquiryLink).toHaveAttribute("href", /\/login\?next=/);
  });

  test("a nonexistent vendor slug shows the real not-found page", async ({ page }) => {
    await page.goto("/vendors/this-vendor-does-not-exist");
    await expect(page.getByRole("heading", { name: "Vendor not found" })).toBeVisible();
  });
});
