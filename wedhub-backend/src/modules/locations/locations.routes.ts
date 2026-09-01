import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as locationsController from "./locations.controller";
import { createLocationSchema, listLocationsQuerySchema, updateLocationSchema } from "./locations.schema";

export const locationsRouter = Router();

locationsRouter.get(
  "/",
  validateQuery(listLocationsQuerySchema),
  asyncHandler(locationsController.listLocations),
);

locationsRouter.post(
  "/",
  authenticateMiddleware,
  authorize(Role.ADMIN),
  validateBody(createLocationSchema),
  asyncHandler(locationsController.createLocation),
);

locationsRouter.patch(
  "/:id",
  authenticateMiddleware,
  authorize(Role.ADMIN),
  validateBody(updateLocationSchema),
  asyncHandler(locationsController.updateLocation),
);
