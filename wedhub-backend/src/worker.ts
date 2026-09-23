import { logger } from "./config/logger";
import { startMediaProcessingWorker } from "./jobs/processors/media-processing.processor";
import { startNotificationDeliveryWorker } from "./jobs/processors/notification-delivery.processor";
import { startProfileCompletionReminderWorker } from "./jobs/processors/profile-completion-reminder.processor";
import { registerProfileCompletionReminderSchedule } from "./jobs/schedules/profile-completion-reminder.schedule";

const mediaWorker = startMediaProcessingWorker();
const notificationDeliveryWorker = startNotificationDeliveryWorker();
const profileCompletionReminderWorker = startProfileCompletionReminderWorker();

logger.info("Media processing worker started");
logger.info("Notification delivery worker started");
logger.info("Profile completion reminder worker started");

// Registers (or updates, idempotently) the daily repeatable job — must run
// after the worker above is listening, so the very first scheduled tick has
// a consumer ready for it.
void registerProfileCompletionReminderSchedule()
  .then(() => logger.info("Profile completion reminder schedule registered"))
  .catch((err) => logger.error({ err }, "Failed to register profile completion reminder schedule"));

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down worker`);
  void Promise.all([mediaWorker.close(), notificationDeliveryWorker.close(), profileCompletionReminderWorker.close()]).then(() =>
    process.exit(0),
  );
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
