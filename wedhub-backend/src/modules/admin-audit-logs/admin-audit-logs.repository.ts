import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

function buildWhere(filter: { entityType: string | undefined; entityId: string | undefined; actorId: string | undefined }): Prisma.AuditLogWhereInput {
  return {
    ...(filter.entityType ? { entityType: filter.entityType } : {}),
    ...(filter.entityId ? { entityId: filter.entityId } : {}),
    ...(filter.actorId ? { actorId: filter.actorId } : {}),
  };
}

export function listAuditLogs(filter: {
  entityType: string | undefined;
  entityId: string | undefined;
  actorId: string | undefined;
  page: number;
  limit: number;
}) {
  return prisma.auditLog.findMany({
    where: buildWhere(filter),
    include: { actor: { select: { id: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countAuditLogs(filter: { entityType: string | undefined; entityId: string | undefined; actorId: string | undefined }) {
  return prisma.auditLog.count({ where: buildWhere(filter) });
}
