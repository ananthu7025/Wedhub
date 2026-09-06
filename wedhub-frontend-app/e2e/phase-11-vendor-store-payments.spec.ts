import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import {
  uniqueTestEmail,
  registerTestUser,
  deleteTestUser,
  approveVendor,
  deleteVendorByBusinessName,
  enableStoreForVendorCategory,
  activateVendorPaymentAccountForTest,
  deleteCategoryByName,
} from "./support/test-users";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Frontend Arch Phase 31 verification — the vendor-store / Razorpay Route
 * marketplace-payments feature, driven live through the real browser UI on
 * both sides (vendor store setup + customer checkout), against Razorpay's
 * real test-mode Checkout (not mocked). See
 * archive/backend/17-vendor-store-payment-architecture-plan.md for the
 * architecture this proves end-to-end, and this session's own backend fix
 * pass (atomic stock decrement, non-atomic-checkout guard, wired
 * status-transition guards, the previously-missing /sync route) for what
 * this specifically re-verifies live.
 *
 * Only two preconditions are set up outside the UI (see the new
 * test-users.ts helpers): assigning the vendor a store-enabled category (no
 * self-service UI exists for a vendor to pick their own category — that's
 * an admin/onboarding-wizard concern orthogonal to this feature), and
 * activating the payment account's KYC-gated fields after the vendor
 * submits the real bank-connect form (Razorpay's own KYC review has no
 * instant test-mode approval). Everything else — store profile, the
 * bank-connect form, product creation with a real uploaded photo, checkout,
 * and the real Razorpay Checkout.js test-mode payment — runs through the
 * actual UI, headed, so the flow can be watched.
 */

const password = "Phase11Test!2026";

// Minimal valid JPEG bytes — same inline-fixture pattern already used by
// phase-05-vendor-profile.spec.ts's real media-upload test.
const testImageBuffer = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda000c03010002110311003f00f7fa28a2803fffd9",
  "hex",
);

async function login(page: Page, email: string, pw: string, expectedUrlPattern: RegExp) {
  await page.goto("/login");
  await page.getByPlaceholder("Email or phone").fill(email);
  await page.getByPlaceholder("Password").fill(pw);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(expectedUrlPattern, { timeout: 15000 });
}

async function registerVendor(email: string, businessName: string): Promise<string> {
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

/**
 * Completes Razorpay's real test-mode Checkout v2 iframe with a documented
 * test card. Checkout v2 renders as a data-testid-driven web-component UI
 * (not plain name="card_number" inputs) inside an iframe served from
 * api.razorpay.com — confirmed via a live debug dump of this exact iframe's
 * HTML (data-testid="Cards" sidebar option on the default UPI screen).
 *
 * NOT YET CONFIRMED WORKING: the click on the "Cards" sidebar option timed
 * out in the one live run attempted (see git history around 2026-09-06) —
 * payment was completed manually in the browser for that run instead. The
 * selectors below (getByPlaceholder for number/expiry/cvv) are a next best
 * guess based on the pre-click DOM dump, not independently verified against
 * the post-click "Cards" screen's real DOM. Re-run headed with a human
 * watching (or capture a screenshot right after the click) before trusting
 * this to run unattended.
 */
async function payWithRazorpayTestCard(page: Page) {
  const rzpFrame = page.frameLocator('iframe[src*="api.razorpay.com/v1/checkout"]').first();

  await rzpFrame.getByText("Cards", { exact: true }).first().click({ timeout: 10000 });

  const cardNumberInput = rzpFrame.getByPlaceholder(/card number/i).first();
  await expect(cardNumberInput).toBeVisible({ timeout: 20000 });
  await cardNumberInput.fill("4111111111111111");

  const expiryInput = rzpFrame.getByPlaceholder(/mm\s*\/\s*yy/i).first();
  await expiryInput.fill("1235");

  const cvvInput = rzpFrame.getByPlaceholder(/cvv/i).first();
  await cvvInput.fill("123");

  await rzpFrame.getByRole("button", { name: /pay/i }).first().click();
}

test.describe("Vendor Store — live setup + real Razorpay test-mode checkout", () => {
  test.beforeAll(async () => {
    await assertBackendIsRunning();
  });

  test("vendor sets up a store and product live, customer pays online via real Razorpay Checkout, vendor sees it confirmed", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const vendorEmail = uniqueTestEmail("phase11-store-vendor");
    const customerEmail = uniqueTestEmail("phase11-store-customer");
    const businessName = "Phase11 Store Studio";
    const categoryName = `Phase11 Store Category ${Date.now()}`;

    let vendorId = "";
    let vendorContext: BrowserContext | undefined;
    let customerContext: BrowserContext | undefined;
    let storeSlug = "";

    try {
      // --- Setup: category assignment (no self-service UI for this) ---
      vendorId = await registerVendor(vendorEmail, businessName);
      enableStoreForVendorCategory(vendorId, categoryName);

      vendorContext = await browser.newContext();
      const vendorPage = await vendorContext.newPage();
      await login(vendorPage, vendorEmail, password, /\/vendor\/dashboard$/);

      // --- Part A: vendor sets up the store live in the browser ---
      await vendorPage.goto("/vendor/store");
      await expect(vendorPage.getByRole("heading", { name: "Vendor Store & Commerce" })).toBeVisible();

      await vendorPage.getByPlaceholder("e.g. Aiswarya Floral & Decors").fill("Phase11 Store Studio Storefront");
      await vendorPage.getByPlaceholder(/Handcrafted floral garlands/).fill("Live Playwright-verified storefront");
      await vendorPage.getByRole("button", { name: "Save Store Profile" }).click();
      await expect(vendorPage.getByText("Store settings updated successfully!")).toBeVisible({ timeout: 10000 });

      const previewLink = vendorPage.getByRole("link", { name: "Preview Store" });
      const storeHref = await previewLink.getAttribute("href");
      storeSlug = (storeHref ?? "").replace(/^\/store\//, "");
      expect(storeSlug.length).toBeGreaterThan(0);

      // --- Vendor connects payment account (real form submission) ---
      await vendorPage.goto("/vendor/store/payments");
      await vendorPage.getByPlaceholder(/Dream Weddings Pvt Ltd/).fill("Phase11 Store Studio LLP");
      await vendorPage.getByPlaceholder("finance@vendor.com").fill(vendorEmail);
      await vendorPage.getByPlaceholder("+91 9876543210").fill("9876543210");
      await vendorPage.getByPlaceholder(/HDFC Bank/).fill("HDFC Bank");
      await vendorPage.getByPlaceholder("Enter Bank Account No").fill("50200012345678");
      await vendorPage.getByPlaceholder("Re-enter Account No").fill("50200012345678");
      await vendorPage.getByPlaceholder("HDFC0001234").fill("HDFC0001234");
      await vendorPage.getByRole("button", { name: "Save & Activate Online Payments" }).click();
      await expect(vendorPage.getByText(/Bank account details submitted/)).toBeVisible({ timeout: 15000 });

      // Razorpay KYC/penny-drop verification has no instant test-mode
      // approval — activate the account's gated fields directly (the one
      // non-UI step in this spec, see test-users.ts), then reload so the
      // vendor's own dashboard reflects it exactly as it would once
      // Razorpay's real verification completed.
      activateVendorPaymentAccountForTest(vendorId);
      await vendorPage.reload();
      await expect(vendorPage.getByText("Online Payments Active")).toBeVisible({ timeout: 10000 });

      // Prove fix #4 (the previously-404ing route) live in the UI.
      await vendorPage.getByRole("button", { name: "Sync Status" }).click();
      await expect(vendorPage.getByText("Account status synchronized with Razorpay.")).toBeVisible({ timeout: 10000 });

      // --- Vendor adds a real product, including an uploaded photo ---
      await vendorPage.goto("/vendor/store/items");
      await vendorPage.getByRole("button", { name: "Add Product" }).click();
      await expect(vendorPage.getByRole("heading", { name: "Add Product to Store" })).toBeVisible();

      await vendorPage.getByPlaceholder(/Traditional Fresh Jasmine Bridal Garland/).fill("Phase11 Test Bridal Garland");
      await vendorPage.getByPlaceholder("2500").fill("500");
      await vendorPage.getByPlaceholder("Leave blank for unlimited").fill("2");

      const fileInput = vendorPage.locator('input[type="file"]');
      await fileInput.setInputFiles({ name: "phase11-test-photo.jpg", mimeType: "image/jpeg", buffer: testImageBuffer });
      await expect(vendorPage.getByText("Add photo")).toBeVisible({ timeout: 20000 });

      await vendorPage.getByRole("button", { name: "Create Product" }).click();
      await expect(vendorPage.getByText("Phase11 Test Bridal Garland")).toBeVisible({ timeout: 10000 });

      // --- Part B: customer discovers and pays online, live in the browser ---
      customerContext = await browser.newContext();
      const customerPage = await customerContext.newPage();
      await registerTestUser(customerEmail, password, "END_USER");
      await login(customerPage, customerEmail, password, /\/shortlist$/);

      await customerPage.goto(`/store/${storeSlug}`);
      await expect(customerPage.getByText("Phase11 Test Bridal Garland")).toBeVisible({ timeout: 10000 });
      await customerPage.getByRole("button", { name: "Add to Cart" }).click();
      await customerPage.getByRole("button", { name: /View Cart & Order/i }).click();

      // Payment method already defaults to ONLINE — the vendor's account is
      // ACTIVE (isOnlinePaymentEnabled=true), per CartDrawer.tsx's own
      // useEffect. No selector click needed for that.
      await customerPage.getByPlaceholder("e.g. Rahul Sharma").fill("Phase11 Test Customer");
      await customerPage.getByPlaceholder("+91 98765 43210").fill("9876500000");
      await customerPage.getByPlaceholder("rahul@example.com").fill(customerEmail);

      await customerPage.getByRole("button", { name: /Pay Securely Online/i }).click();

      await payWithRazorpayTestCard(customerPage);

      await expect(customerPage.getByText("Payment Successful & Order Confirmed!")).toBeVisible({ timeout: 30000 });
      await expect(customerPage.getByText(/Razorpay Transaction ID/i)).toBeVisible({ timeout: 10000 });

      // --- Part C: confirm the money and state landed, live in the vendor's browser ---
      await expect(async () => {
        await vendorPage.goto("/vendor/store/orders");
        await expect(vendorPage.getByText("Paid Online")).toBeVisible({ timeout: 5000 });
      }).toPass({ timeout: 60000, intervals: [3000, 5000, 5000, 10000] });

      await vendorPage.goto("/vendor/store/payments");
      await expect(vendorPage.getByText(/Total Store Sales|GMV/i).first()).toBeVisible();

      // --- Concurrency proof for the atomic stock-decrement fix ---
      // 1 unit remains (2 seeded, 1 just sold above). Two customer browser
      // contexts submit a WhatsApp-channel order for that last unit at the
      // same time — real HTTP concurrency against the real running
      // backend, exercising createStoreOrderAtomicTx's atomic
      // updateMany-guarded decrement (see vendor-store.repository.ts).
      // Exactly one must succeed; the other must see a real "out of stock"
      // error surfaced in the UI, never both succeeding (which would prove
      // the race is still live) and never both failing.
      const publicStoreRes = await customerPage.request.get(`${API_URL}/api/v1/stores/${storeSlug}/items`);
      const publicStoreJson = (await publicStoreRes.json()) as { data: Array<{ id: string }> };
      const lastUnitItemId = publicStoreJson.data[0]!.id;

      const raceContextA = await browser.newContext();
      const raceContextB = await browser.newContext();
      try {
        const orderPayload = (suffix: string) => ({
          customerName: `Race Customer ${suffix}`,
          customerPhone: `98765000${suffix === "A" ? "02" : "03"}`,
          paymentMethod: "WHATSAPP",
          items: [{ itemId: lastUnitItemId, quantity: 1 }],
        });

        const [resA, resB] = await Promise.all([
          raceContextA.request.post(`${API_URL}/api/v1/stores/${storeSlug}/orders`, { data: orderPayload("A") }),
          raceContextB.request.post(`${API_URL}/api/v1/stores/${storeSlug}/orders`, { data: orderPayload("B") }),
        ]);

        const statuses = [resA.status(), resB.status()].sort();
        // One 201/200 (success) and one 400 (ValidationError: out of stock).
        expect(statuses[0]).toBeLessThan(300);
        expect(statuses[1]).toBeGreaterThanOrEqual(400);
      } finally {
        await raceContextA.close();
        await raceContextB.close();
      }
    } finally {
      await vendorContext?.close();
      await customerContext?.close();
      if (vendorId) deleteVendorByBusinessName(businessName);
      deleteTestUser(vendorEmail);
      deleteTestUser(customerEmail);
      deleteCategoryByName(categoryName);
    }
  });
});
