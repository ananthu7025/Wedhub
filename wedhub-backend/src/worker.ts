import { logger } from "./config/logger";
import { startMediaProcessingWorker } from "./jobs/processors/media-processing.processor";
import { startNotificationDeliveryWorker } from "./jobs/processors/notification-delivery.processor";

const mediaWorker = startMediaProcessingWorker();
const notificationDeliveryWorker = startNotificationDeliveryWorker();

logger.info("Media processing worker started");
logger.info("Notification delivery worker started");

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down worker`);
  void Promise.all([mediaWorker.close(), notificationDeliveryWorker.close()]).then(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
