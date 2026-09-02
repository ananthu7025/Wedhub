import type { Request, Response } from "express";
import { paginatedResponse } from "../../common/utils/api-response.util";
import * as adminAuditLogsService from "./admin-audit-logs.service";
import type { ListAuditLogsQuery } from "./admin-audit-logs.schema";

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListAuditLogsQuery;
  const [logs, total] = await adminAuditLogsService.listAuditLogs({
    entityType: query.entityType,
    entityId: query.entityId,
    actorId: query.actorId,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(logs, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }),
  );
}
