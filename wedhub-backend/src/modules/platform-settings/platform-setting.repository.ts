import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export function findByKey(key: string) {
  return prisma.platformSetting.findUnique({ where: { key } });
}

export function upsert(key: string, value: Prisma.InputJsonValue, updatedByUserId: string) {
  return prisma.platformSetting.upsert({
    where: { key },
    update: { value, updatedByUserId },
    create: { key, value, updatedByUserId },
  });
}
