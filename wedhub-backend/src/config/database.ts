import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";
import { isDevelopment } from "./env";

export const prisma = new PrismaClient({
  log: isDevelopment ? ["warn", "error"] : ["error"],
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
