import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as usersController from "./users.controller";
import { updateProfileSchema, upsertWeddingProfileSchema } from "./users.schema";

export const usersRouter = Router();

usersRouter.use(authenticateMiddleware);

usersRouter.get("/me", asyncHandler(usersController.getMe));
usersRouter.patch("/me", validateBody(updateProfileSchema), asyncHandler(usersController.updateMe));
usersRouter.delete("/me", asyncHandler(usersController.deleteMe));

usersRouter.put(
  "/me/wedding-profile",
  validateBody(upsertWeddingProfileSchema),
  asyncHandler(usersController.upsertWeddingProfile),
);
usersRouter.delete("/me/wedding-profile", asyncHandler(usersController.deleteWeddingProfile));

usersRouter.post("/me/deactivate", asyncHandler(usersController.deactivateMe));
