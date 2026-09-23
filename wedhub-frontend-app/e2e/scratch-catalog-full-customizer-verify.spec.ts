import { test, expect } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";

const VENDOR_EMAIL = "catalog-verify-test@wedhub.dev";
const VENDOR_PASSWORD = "CatalogTest123!";
const VENDOR_SLUG = "catalog-verify-test-bridal";

const testImageBuffer = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda000c03010002110311003f00f7fa28a2803fffd9",
  "hex",
);

test.describe("Catalog storefront customizer — full tabbed settings", () => {
  test.beforeAll(async () => {
    await assertBackendIsRunning();
  });

  test("vendor fills every tab, saves, and public page reflects every section", async ({ page }) => {
    test.setTimeout(150_000);

    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(VENDOR_EMAIL);
    await page.getByPlaceholder("Password").fill(VENDOR_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/vendor\/dashboard$/, { timeout: 15000 });

    // The test catalog item already has a photo attached directly via the DB
    // (scratch-add-item-photo.js) so the gallery section has something to show.
    await page.goto("/vendor/catalog");
    await page.getByRole("button", { name: "Customize Storefront" }).click();
    await expect(page.getByRole("heading", { name: "Customize Storefront" })).toBeVisible();

    // Banner & Theme (default tab)
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    await fileInput.setInputFiles({ name: "banner.jpg", mimeType: "image/jpeg", buffer: testImageBuffer });
    await expect(page.getByText("Replace")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Navy" }).click();

    // Hero tab
    await page.getByRole("button", { name: "Hero", exact: true }).click();
    await page.getByPlaceholder(/Exquisite Bridal Suites/).fill("E2E Hero Headline");
    await page.getByPlaceholder(/Tradition Meets/).fill("E2E Tagline");
    await page.getByPlaceholder(/Handcrafted rental pieces/).fill("E2E hero subtitle text.");
    await page.getByPlaceholder(/100% Sanitized/).fill("E2E announcement ticker text");
    await page.getByPlaceholder("e.g. Shop Collection").fill("E2E Shop Now");
    await page.getByPlaceholder("e.g. Book a Studio Trial").fill("E2E Book Trial");

    // Sections tab
    await page.getByRole("button", { name: "Sections" }).click();
    await page.getByPlaceholder("e.g. Shop by Category").fill("E2E Category Heading");
    await page.getByPlaceholder(/Explore our handcrafted/).fill("E2E category subheading");
    await page.getByPlaceholder("e.g. Featured Collections").fill("E2E Featured Heading");
    await page.getByPlaceholder(/most loved pieces/).fill("E2E featured subheading");

    // Promo Banner tab
    await page.getByRole("button", { name: "Promo Banner" }).click();
    await page.getByPlaceholder("e.g. Studio Trials").fill("E2E Eyebrow");
    await page.getByPlaceholder(/Try Before Your Big Day/).fill("E2E Promo Heading");
    await page.getByPlaceholder(/experience our collections/).fill("E2E promo description text.");
    await page.getByPlaceholder("e.g. Make it Memorable").fill("E2E Quote");

    // Gallery tab
    await page.getByRole("button", { name: "Gallery" }).click();
    await page.getByPlaceholder(/Real Brides, Real Moments/).fill("E2E Gallery Heading");
    await page.getByPlaceholder(/closer look/).fill("E2E gallery subheading");
    await page.getByPlaceholder(/instagram.com/).fill("https://instagram.com/e2etest");

    // Trust Badges tab
    await page.getByRole("button", { name: "Trust Badges" }).click();
    await page.getByRole("button", { name: "+ Add trust badge" }).click();
    await page.getByPlaceholder(/Flexible Rental Dates/).last().fill("E2E Badge Title");
    await page.getByPlaceholder(/Choose what works/).last().fill("E2E Badge Subtitle");

    // Footer tab
    await page.getByRole("button", { name: "Footer" }).click();
    await page.getByPlaceholder(/short line about your business/).fill("E2E footer about text.");
    await page.getByPlaceholder("e.g. Quick Links").fill("E2E Links");
    await page.getByPlaceholder("e.g. Customer Support").fill("E2E Support");
    await page.getByPlaceholder("e.g. Follow Us").fill("E2E Social");
    await page.getByRole("button", { name: "+ Add footer link" }).click();
    await page.getByPlaceholder(/Rental Guide/).last().fill("E2E Footer Link");
    await page.getByPlaceholder(/wa.me\/919876543210/).last().fill("https://wa.me/919876543210");

    await page.getByRole("button", { name: "Save Storefront Settings" }).click();
    await expect(page.getByText(/Saved successfully/)).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: "/tmp/full-customizer-saved.png", fullPage: false });

    // Visit public page and verify every section
    await page.goto(`/catalog/${VENDOR_SLUG}`);
    await expect(page.getByText("E2E announcement ticker text")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("E2E Tagline")).toBeVisible();
    await expect(page.getByText("E2E Hero Headline")).toBeVisible();
    await expect(page.getByText("E2E hero subtitle text.")).toBeVisible();
    await expect(page.getByRole("link", { name: /E2E Shop Now/ })).toBeVisible();

    await page.screenshot({ path: "/tmp/full-public-hero.png", fullPage: false });

    await expect(page.getByText("E2E Featured Heading")).toBeVisible();
    await expect(page.getByText("E2E Badge Title").first()).toBeVisible();
    await expect(page.getByText("E2E Badge Subtitle").first()).toBeVisible();
    await expect(page.getByText("E2E Promo Heading")).toBeVisible();

    await page.getByText("E2E Promo Heading").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/full-public-promo.png", fullPage: false });

    await expect(page.getByText("E2E Gallery Heading")).toBeVisible();
    await page.getByText("E2E Gallery Heading").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/full-public-gallery.png", fullPage: false });

    await expect(page.getByText("E2E footer about text.")).toBeVisible();
    await expect(page.getByText("E2E Links")).toBeVisible();
    await expect(page.getByRole("link", { name: "E2E Footer Link" })).toBeVisible();

    await page.getByText("E2E footer about text.").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/full-public-footer.png", fullPage: false });
  });
});
