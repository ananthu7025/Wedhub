import IORedis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export function createRedisConnection(): IORedis {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  connection.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
  });

  return connection;
}
