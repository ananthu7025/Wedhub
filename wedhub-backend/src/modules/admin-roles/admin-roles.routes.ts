import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as adminRolesController from "./admin-roles.controller";

export const adminRolesRouter = Router();
adminRolesRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

adminRolesRouter.get("/roles", asyncHandler(adminRolesController.listRoles));
adminRolesRouter.get("/permissions", asyncHandler(adminRolesController.listPermissions));
adminRolesRouter.get("/admin-users", asyncHandler(adminRolesController.listAdminUsers));
