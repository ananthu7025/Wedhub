import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import type { LeadNotificationJobData } from "../queues/lead-notification.queue";

// Arch Phase 9 only needs the notification *hook* (product.md §22 lists
// event types; actual channel delivery — in-app/email/Telegram/etc. — is
// Arch Phase 14's job). Same deferral pattern as Arch Phase 2's email
// verification: a structured logger.info line stands in for real delivery,
// clearly marked, rather than silently no-oping or building throwaway
// channel code that Arch Phase 14 would replace anyway.
async function processNotification(data: LeadNotificationJobData): Promise<void> {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: data.leadId },
    include: { vendor: { select: { businessName: true, ownerUserId: true } }, enquiry: true },
  });

  logger.info(
    {
      leadId: lead.id,
      eventType: data.eventType,
      vendorId: lead.vendorId,
      vendorBusinessName: lead.vendor.businessName,
      enquiryContactEmail: lead.enquiry.contactEmail,
    },
    // TODO(Arch Phase 14): replace with real channel delivery (in-app/email/Telegram).
    "Lead notification (delivery pending Arch Phase 14)",
  );
}

export function startLeadNotificationWorker(): Worker<LeadNotificationJobData> {
  const worker = new Worker<LeadNotificationJobData>(
    "lead-notification",
    async (job: Job<LeadNotificationJobData>) => {
      await processNotification(job.data);
    },
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Lead notification job failed permanently");
  });

  return worker;
}
