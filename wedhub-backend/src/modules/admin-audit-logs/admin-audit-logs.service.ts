import * as adminAuditLogsRepository from "./admin-audit-logs.repository";

export function listAuditLogs(filter: {
  entityType: string | undefined;
  entityId: string | undefined;
  actorId: string | undefined;
  page: number;
  limit: number;
}) {
  return Promise.all([adminAuditLogsRepository.listAuditLogs(filter), adminAuditLogsRepository.countAuditLogs(filter)]);
}
