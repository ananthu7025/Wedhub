import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateQuery } from "../../common/middleware/validate.middleware";
import { optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { searchRateLimiter } from "../../common/middleware/rate-limit.middleware";
import * as searchController from "./search.controller";
import { searchVendorsQuerySchema } from "./search.schema";

export const searchRouter = Router();

searchRouter.get(
  "/vendors",
  searchRateLimiter,
  optionalAuthenticateMiddleware,
  validateQuery(searchVendorsQuerySchema),
  asyncHandler(searchController.searchVendors),
);
