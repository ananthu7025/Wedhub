import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import * as vendorRepository from "../../modules/vendors/vendor.repository";
import * as notificationService from "../../modules/notifications/notification.service";
import type { ProfileCompletionReminderJobData } from "../queues/profile-completion-reminder.queue";

// Item 9 — one job run notifies every eligible vendor, not one job per
// vendor: this is a small, bounded daily sweep (DRAFT vendors only), so a
// single job with an internal loop is simpler than fanning out N BullMQ
// jobs for what's realistically a modest row count. A per-vendor notify()
// failure is caught and logged without aborting the rest of the sweep —
// same "never let one failure break the batch" principle as
// messaging.service.ts's per-lead conversation-start loop.
async function runReminderSweep(): Promise<{ notified: number; failed: number }> {
  const vendors = await vendorRepository.findIncompleteDraftVendors();
  let notified = 0;
  let failed = 0;

  for (const vendor of vendors) {
    if (!vendor.ownerUserId) continue;
    try {
      await notificationService.notify({
        userId: vendor.ownerUserId,
        eventType: "PROFILE_COMPLETION_REMINDER",
        data: { businessName: vendor.businessName, completeness: vendor.profileCompleteness },
        relatedEntityType: "vendor",
        relatedEntityId: vendor.id,
      });
      notified += 1;
    } catch (err) {
      failed += 1;
      logger.error({ err, vendorId: vendor.id }, "Failed to send profile completion reminder for one vendor");
    }
  }

  return { notified, failed };
}

export function startProfileCompletionReminderWorker(): Worker<ProfileCompletionReminderJobData> {
  const worker = new Worker<ProfileCompletionReminderJobData>(
    "profile-completion-reminder",
    async (_job: Job<ProfileCompletionReminderJobData>) => {
      const result = await runReminderSweep();
      logger.info(result, "Profile completion reminder sweep complete");
      return result;
    },
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Profile completion reminder sweep failed");
  });

  return worker;
}
