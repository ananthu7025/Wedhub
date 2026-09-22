import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as platformSettingController from "./platform-setting.controller";
import { updateSettingSchema } from "./platform-setting.schema";

export const platformSettingAdminRouter = Router();
platformSettingAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));
platformSettingAdminRouter.get("/", asyncHandler(platformSettingController.listSettings));
platformSettingAdminRouter.patch("/:key", validateBody(updateSettingSchema), asyncHandler(platformSettingController.updateSetting));
