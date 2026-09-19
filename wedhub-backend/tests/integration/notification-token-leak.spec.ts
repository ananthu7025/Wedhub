import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import { notify } from "../../src/modules/notifications/notification.service";
import { renderNotification } from "../../src/modules/notifications/notification.templates";

/**
 * Proves the fix for the reported bug: a raw verification/reset token must
 * never sit in an IN_APP Notification row (GET /notifications would return
 * it verbatim to the token's owner), while the real link must still be
 * exactly what gets emailed. See notification.templates.ts's channel-aware
 * VERIFICATION/PASSWORD_RESET/EMAIL_CHANGE_CONFIRMATION templates and
 * notification.service.ts's notify(), which now renders per-channel and
 * strips `token` from the persisted `data` for any non-EMAIL channel.
 */
describe("Notification token leak fix", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `notif-token-leak-${Date.now()}@example.com`,
        role: "END_USER",
        status: "ACTIVE",
        passwordHash: "not-a-real-hash",
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("VERIFICATION: the IN_APP row has no token in body or data, but EMAIL content still carries the real link", async () => {
    const rawToken = "raw-verification-token-should-never-leak";

    await notify({ userId, eventType: "VERIFICATION", data: { token: rawToken } });

    const inApp = await prisma.notification.findFirst({ where: { userId, eventType: "VERIFICATION", channel: "IN_APP" } });
    expect(inApp).not.toBeNull();
    expect(inApp!.body).not.toContain(rawToken);
    expect(inApp!.body).not.toContain("verify-email?token=");
    expect(JSON.stringify(inApp!.data ?? {})).not.toContain(rawToken);

    const email = await prisma.notification.findFirst({ where: { userId, eventType: "VERIFICATION", channel: "EMAIL" } });
    expect(email).not.toBeNull();
    expect(email!.body).toContain(rawToken);
    expect(email!.body).toContain("verify-email?token=");

    // Same real link the EMAIL worker will send, produced directly from the
    // template's EMAIL branch (see notification-delivery.processor.ts, which
    // reads title/body straight off the EMAIL-channel row rather than
    // re-rendering — so asserting the row above already proves this, but
    // this direct render call is the alternative the task description
    // itself calls out for exercising the EMAIL content path in isolation).
    const emailContent = renderNotification("VERIFICATION", { token: rawToken }, "EMAIL");
    expect(emailContent.body).toContain(rawToken);
  });

  it("PASSWORD_RESET: a hypothetical IN_APP render is token-free while EMAIL content still carries the real link", async () => {
    // PASSWORD_RESET's DEFAULT_CHANNELS is EMAIL-only today, so notify()
    // never actually produces an IN_APP row for it — asserting that directly
    // guards the fix at the template layer itself (belt-and-suspenders: if
    // an IN_APP default is ever added for this event, it's already safe).
    const rawToken = "raw-reset-token-should-never-leak";

    const inAppContent = renderNotification("PASSWORD_RESET", { token: rawToken }, "IN_APP");
    expect(inAppContent.body).not.toContain(rawToken);
    expect(inAppContent.body).not.toContain("reset-password?token=");

    const emailContent = renderNotification("PASSWORD_RESET", { token: rawToken }, "EMAIL");
    expect(emailContent.body).toContain(rawToken);
    expect(emailContent.body).toContain("reset-password?token=");

    // PASSWORD_RESET's DEFAULT_CHANNELS is EMAIL-only (notification.constants.ts),
    // so the real notify() call is expected to produce only an EMAIL row —
    // which legitimately DOES carry the token, same as VERIFICATION's EMAIL
    // row above. Any non-EMAIL row (were one ever produced) must not.
    await notify({ userId, eventType: "PASSWORD_RESET", data: { token: rawToken } });
    const rows = await prisma.notification.findMany({ where: { userId, eventType: "PASSWORD_RESET" } });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      if (row.channel === "EMAIL") {
        expect(row.body).toContain(rawToken);
      } else {
        expect(row.body).not.toContain(rawToken);
        expect(JSON.stringify(row.data ?? {})).not.toContain(rawToken);
      }
    }
  });

  it("EMAIL_CHANGE_CONFIRMATION: non-EMAIL render is token-free while EMAIL content still carries the real link", () => {
    const rawToken = "raw-email-change-token-should-never-leak";

    const inAppContent = renderNotification("EMAIL_CHANGE_CONFIRMATION", { token: rawToken }, "IN_APP");
    expect(inAppContent.body).not.toContain(rawToken);
    expect(inAppContent.body).not.toContain("confirm-email-change?token=");

    const emailContent = renderNotification("EMAIL_CHANGE_CONFIRMATION", { token: rawToken }, "EMAIL");
    expect(emailContent.body).toContain(rawToken);
    expect(emailContent.body).toContain("confirm-email-change?token=");
  });

  it("an unrelated event type (VENDOR_APPROVED) still renders identical content for every channel", () => {
    const data = { businessName: "Test Photography Co" };
    const inApp = renderNotification("VENDOR_APPROVED", data, "IN_APP");
    const email = renderNotification("VENDOR_APPROVED", data, "EMAIL");
    expect(inApp).toEqual(email);
  });
});
