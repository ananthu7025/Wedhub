import { prisma } from "../../config/database";
import { RateLimitError } from "../../common/errors";
import { enqueueWhatsAppDelivery } from "../../jobs/queues/whatsapp-delivery.queue";

export interface SendWhatsAppDirectInput {
  to: string; // E.164 phone number
  templateName: string;
  languageCode: string;
  params: string[];
}

// See PLAN-2026-09-30-whatsapp-notification-channel.md §5: an IP-keyed
// middleware limiter (whatsAppSendRateLimiter) doesn't stop many different
// IPs hammering the same phone number (e.g. a resend button abused from
// several devices/networks), so this is a second, recipient-keyed guard.
// Implemented as a DB check against WhatsAppDirectSend itself rather than a
// new Redis key-value pattern — this codebase has no existing precedent for
// ad-hoc Redis state outside BullMQ, so reusing the table already being
// written avoids introducing one for a single narrow check.
const RECIPIENT_COOLDOWN_MS = 30_000;

async function assertRecipientNotOnCooldown(to: string): Promise<void> {
  const recent = await prisma.whatsAppDirectSend.findFirst({
    where: { to, createdAt: { gte: new Date(Date.now() - RECIPIENT_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    throw new RateLimitError("Please wait before requesting another WhatsApp message.");
  }
}

// The entry point for reaching a phone number that has no User row yet
// (e.g. a vendor claiming a bulk-imported listing) — see
// PLAN-2026-09-30-whatsapp-notification-channel.md §4c. Mirrors notify()'s
// own shape: create a PENDING record, enqueue delivery, return — no inline
// network call, so a caller sending 100 of these in a loop is just
// enqueueing 100 lightweight jobs (§6), not making 100 synchronous HTTP
// calls to Meta.
export async function sendWhatsAppDirect(input: SendWhatsAppDirectInput): Promise<{ id: string }> {
  await assertRecipientNotOnCooldown(input.to);

  const record = await prisma.whatsAppDirectSend.create({
    data: {
      to: input.to,
      templateName: input.templateName,
      languageCode: input.languageCode,
      params: input.params,
    },
  });

  await enqueueWhatsAppDelivery({
    kind: "direct",
    directSendId: record.id,
    to: input.to,
    templateName: input.templateName,
    languageCode: input.languageCode,
    params: input.params,
  });

  return { id: record.id };
}
