import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as adminAuditLogsController from "./admin-audit-logs.controller";
import { listAuditLogsQuerySchema } from "./admin-audit-logs.schema";

export const adminAuditLogsRouter = Router();
adminAuditLogsRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

adminAuditLogsRouter.get("/", validateQuery(listAuditLogsQuerySchema), asyncHandler(adminAuditLogsController.listAuditLogs));
