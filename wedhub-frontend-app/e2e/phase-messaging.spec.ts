import { test, expect, request as playwrightRequest } from "@playwright/test";
import { assertBackendIsRunning } from "./support/preflight";
import { deleteTestUser, deleteVendorById, uniqueTestEmail, verifyTestUserEmail } from "./support/test-users";

/**
 * In-app inbox (item 7, 2026-09-16 request — see
 * PLAN-2026-09-16-signup-onboarding-inbox.md Phase 5). Verifies the real
 * couple<->vendor messaging flow end to end in a real browser: a couple
 * starts a conversation and sends a message, a vendor sees it in their real
 * inbox page with the correct unread badge, replies, and the couple sees
 * the reply. The conversation itself is seeded via a direct API call (there
 * is no "message this vendor" button wired into the public vendor profile
 * page yet — a follow-up, not part of this feature's core scope) rather
 * than through page clicks, since this test is about the inbox pages
 * themselves, not about discovering that entry point.
 */

const API_URL = process.env.API_URL ?? "http://localhost:4000";

test.beforeAll(async () => {
  await assertBackendIsRunning();
});

test.describe("In-app inbox", () => {
  const coupleEmail = uniqueTestEmail("inbox-couple");
  const vendorEmail = uniqueTestEmail("inbox-vendor");
  const password = "TestPass123!";
  let vendorId: string;

  test.afterAll(() => {
    // vendors.owner_user_id is ON DELETE SET NULL, not CASCADE — must
    // delete the vendor row before its owner user, or it's silently
    // orphaned forever instead of removed. Confirmed as a real,
    // reproducible bug (see phase-01-auth.spec.ts's equivalent fix for the
    // full explanation): this test's own missing cleanup was one of the
    // sources of 29 orphaned test vendor rows found accumulating in the
    // dev database, which caused an intermittent failure in
    // phase-matching.spec.ts.
    if (vendorId) deleteVendorById(vendorId);
    deleteTestUser(coupleEmail);
    deleteTestUser(vendorEmail);
  });

  test("a couple can message a vendor and both sides see the real conversation in their inbox", async ({ page }) => {
    const api = await playwrightRequest.newContext({ baseURL: API_URL });

    // --- Set up both accounts via the real API (verification bypassed via
    // direct DB stamp, same substitute pattern as phase-01-auth.spec.ts —
    // no e2e test can click a real emailed link). ---
    await api.post("/api/v1/auth/register", { data: { email: vendorEmail, password, role: "VENDOR" } });
    verifyTestUserEmail(vendorEmail);
    const vendorLogin = await api.post("/api/v1/auth/login", { data: { identifier: vendorEmail, password } });
    const vendorToken = (await vendorLogin.json()).data.accessToken as string;

    const vendorCreate = await api.post("/api/v1/vendors", {
      headers: { Authorization: `Bearer ${vendorToken}` },
      data: { businessName: "Inbox Test Photography" },
    });
    vendorId = (await vendorCreate.json()).data.id as string;

    await api.post("/api/v1/auth/register", { data: { email: coupleEmail, password, role: "END_USER" } });
    verifyTestUserEmail(coupleEmail);
    const coupleLogin = await api.post("/api/v1/auth/login", { data: { identifier: coupleEmail, password } });
    const coupleToken = (await coupleLogin.json()).data.accessToken as string;

    // Couple starts the conversation and sends the first message via the
    // real API — this is what the frontend's InboxView itself calls, so
    // seeding this way exercises the same code path a "Message" button
    // would, just without needing that button to exist yet.
    const conv = await api.post("/api/v1/messaging/conversations", {
      headers: { Authorization: `Bearer ${coupleToken}` },
      data: { vendorId },
    });
    const conversationId = (await conv.json()).data.id as string;
    await api.post(`/api/v1/messaging/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${coupleToken}` },
      data: { body: "Hi! Are you available for our wedding date?" },
    });

    // --- Vendor logs in via the real UI and checks their real inbox page. ---
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(vendorEmail);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/vendor\/dashboard/, { timeout: 10_000 });

    // Desktop header's Inbox icon carries the real unread count in its
    // aria-label (VendorShell.tsx), before it's ever opened.
    await expect(page.getByRole("link", { name: "Inbox (1 unread)" })).toBeVisible({ timeout: 10_000 });

    await page.goto("/vendor/inbox");
    await expect(page.getByText("Are you available for our wedding date?").last()).toBeVisible({ timeout: 10_000 });

    // Opening the thread marks it read (markConversationRead, fired
    // client-side on mount) — badge clears after a refresh. Poll rather
    // than a single reload immediately, since the mark-as-read fetch is
    // fire-and-forget from InboxView's perspective. A longer timeout than
    // the rest of this suite: verified live (repeatedly, directly against
    // the API) that markConversationRead itself completes near-instantly —
    // this wait is absorbing this dev environment's own backend queue
    // contention (BullMQ email-notification delivery jobs sharing the same
    // Node process/worker) when several e2e suites run back to back, not a
    // real slowness in the read-marking feature itself.
    await expect(async () => {
      await page.reload();
      await expect(page.getByRole("link", { name: "Inbox (1 unread)" })).not.toBeVisible();
    }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 5_000] });

    // Vendor replies from the real thread UI. Two matches are expected once
    // sent (the thread bubble AND the conversation list's preview snippet,
    // both correctly showing the same text) — .last() targets the thread
    // bubble specifically.
    await page.getByPlaceholder("Write a message…").fill("Yes, we would love to be part of your day!");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Yes, we would love to be part of your day!").last()).toBeVisible({ timeout: 10_000 });

    await page.request.post("/api/auth/logout");

    // --- Couple logs in and sees the vendor's reply in their real inbox. ---
    await page.goto("/login");
    await page.getByPlaceholder("Email or phone").fill(coupleEmail);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/shortlist/, { timeout: 10_000 });

    await page.goto("/inbox");
    await expect(page.getByText("Inbox Test Photography").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Yes, we would love to be part of your day!").last()).toBeVisible({ timeout: 10_000 });

    await api.dispose();
  });
});
