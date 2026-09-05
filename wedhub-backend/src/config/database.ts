import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";
import { isDevelopment } from "./env";

const SLOW_QUERY_THRESHOLD_MS = 200;

const basePrisma = new PrismaClient({
  log: isDevelopment ? ["warn", "error"] : ["error"],
});

// Minimal query-duration visibility (not a full APM rollout) — logs any
// query slower than SLOW_QUERY_THRESHOLD_MS at "warn", so slow queries show
// up in normal log output without a dedicated metrics backend.
export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query }) {
      const start = performance.now();
      const result = await query(args);
      const durationMs = performance.now() - start;
      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn({ model, operation, durationMs: Math.round(durationMs) }, "Slow database query");
      }
      return result;
    },
  },
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, "Database health check failed");
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
