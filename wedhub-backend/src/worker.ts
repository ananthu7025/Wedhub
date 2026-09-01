import { logger } from "./config/logger";
import { startMediaProcessingWorker } from "./jobs/processors/media-processing.processor";

const worker = startMediaProcessingWorker();

logger.info("Media processing worker started");

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down worker`);
  void worker.close().then(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
