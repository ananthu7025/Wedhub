import { test, expect, request as playwrightRequest } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { deleteTestUser, uniqueTestEmail, verifyTestUserEmail } from "./support/test-users";

/**
 * Couple profile-setup wizard's draft-save, leave-confirmation, and
 * field-validation behavior (items 4 and 5, 2026-09-16 request) — the
 * happy-path submission itself is already covered end to end by
 * phase-01-auth.spec.ts's couple signup test; this spec targets the wizard
 * mechanics that test doesn't touch.
 */

const API_URL = process.env.API_URL ?? "http://localhost:4000";

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

test.describe("Couple profile-setup wizard", () => {
  const email = uniqueTestEmail("wizard");
  const password = "TestPass123!";

  test.afterAll(() => {
    deleteTestUser(email);
  });

  test("validates fields, saves a draft, resumes it, and warns before leaving with unsaved progress", async ({ page }) => {
    const api = await playwrightRequest.newContext({ baseURL: API_URL });
    await api.post("/api/v1/auth/register", { data: { email, password, role: "END_USER" } });
    verifyTestUserEmail(email);
    await api.dispose();

    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    // Wait for login's own redirect to actually land before navigating away
    // — without this, page.goto("/profile-setup") races the login button's
    // in-flight client-side redirect to /shortlist and can lose.
    await expect(page).toHaveURL(/\/shortlist/, { timeout: 10_000 });

    await page.goto("/profile-setup");
    await expect(page.getByRole("heading", { name: "Set up your wedding profile" })).toBeVisible({ timeout: 10_000 });

    // Field validation (item 5): step 1 requires at least one event date.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Add at least one event date")).toBeVisible();

    // Add a function dated in the past — rejected with a specific message,
    // not just a generic "required" error.
    await page.getByRole("button", { name: "+ Add a function" }).click();
    await page.locator('input[type="date"]').fill("2020-01-01");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Date cannot be in the past")).toBeVisible();

    // Fix the date — validation clears and the step advances.
    await page.locator('input[type="date"]').fill("2027-06-15");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Expected number of visitors" })).toBeVisible();

    // Save as draft (item 4) explicitly via the header button.
    await page.getByRole("button", { name: "Save as draft" }).click();

    // Leave-confirmation (item 4): clicking a real in-app link out of the
    // wizard while there's unsaved progress shows WizardGuard's prompt
    // rather than navigating straight away. The header's brand-logo link
    // goes to "/", a real same-app link WizardGuard intercepts.
    await page.getByRole("link", { name: /itsmyKalyanam/i }).first().click();
    await expect(page.getByText("Save your progress?")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Save your progress?")).not.toBeVisible();

    // Still on the wizard, unnavigated — reload the whole page (simulating
    // closing the tab and coming back) and confirm the earlier draft
    // (the event date from step 1) survived via localStorage.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Set up your wedding profile" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Landing back on "Expected number of visitors" (step 2) rather than
    // step 1's empty state confirms the draft's event date actually
    // persisted and was reloaded, not lost on refresh.
    await expect(page.getByRole("heading", { name: "Expected number of visitors" })).toBeVisible({ timeout: 10_000 });
  });
});
