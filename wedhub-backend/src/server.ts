import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { disconnectDatabase } from "./config/database";

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`WedHub backend listening on ${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down`);
  server.close(() => {
    void disconnectDatabase().finally(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
