import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as offerController from "./offer.controller";
import { createOfferSchema, listPublicOffersQuerySchema, updateOfferSchema } from "./offer.schema";

// Vendor self-service: /api/v1/offers/me/*
export const offerRouter = Router();
offerRouter.use(authenticateMiddleware, authorize(Role.VENDOR));

offerRouter.get("/me", asyncHandler(offerController.listMyOffers));
offerRouter.post("/me", validateBody(createOfferSchema), asyncHandler(offerController.createOffer));
offerRouter.get("/me/:id", asyncHandler(offerController.getMyOffer));
offerRouter.put("/me/:id", validateBody(updateOfferSchema), asyncHandler(offerController.updateOffer));
offerRouter.delete("/me/:id", asyncHandler(offerController.deleteOffer));

// Public: /api/v1/offers (Offer Wall discovery feed)
export const publicOfferRouter = Router();
publicOfferRouter.get(
  "/",
  validateQuery(listPublicOffersQuerySchema),
  asyncHandler(offerController.listPublicOffers),
);
