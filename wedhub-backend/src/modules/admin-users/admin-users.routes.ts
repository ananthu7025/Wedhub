import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as adminUsersController from "./admin-users.controller";
import { listUsersQuerySchema, suspendUserSchema } from "./admin-users.schema";

export const adminUsersRouter = Router();
adminUsersRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

adminUsersRouter.get("/", validateQuery(listUsersQuerySchema), asyncHandler(adminUsersController.listUsers));
adminUsersRouter.get("/:id", asyncHandler(adminUsersController.getUser));
adminUsersRouter.post(
  "/:id/suspend",
  validateBody(suspendUserSchema),
  asyncHandler(adminUsersController.suspendUser),
);
adminUsersRouter.post("/:id/restore", asyncHandler(adminUsersController.restoreUser));
