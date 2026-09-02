import { logger } from "./config/logger";
import { startMediaProcessingWorker } from "./jobs/processors/media-processing.processor";
import { startLeadNotificationWorker } from "./jobs/processors/lead-notification.processor";

const mediaWorker = startMediaProcessingWorker();
const leadNotificationWorker = startLeadNotificationWorker();

logger.info("Media processing worker started");
logger.info("Lead notification worker started");

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down worker`);
  void Promise.all([mediaWorker.close(), leadNotificationWorker.close()]).then(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
