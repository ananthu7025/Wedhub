import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as vendorClaimController from "./vendor-claim.controller";
import { claimLinkSchema, claimRegisterSchema } from "./vendor-claim.schema";

export const vendorClaimRouter = Router();

vendorClaimRouter.get("/:token", asyncHandler(vendorClaimController.resolveInvitation));

vendorClaimRouter.post(
  "/register",
  validateBody(claimRegisterSchema),
  asyncHandler(vendorClaimController.claimRegister),
);

vendorClaimRouter.post(
  "/link",
  authenticateMiddleware,
  validateBody(claimLinkSchema),
  asyncHandler(vendorClaimController.claimLink),
);
