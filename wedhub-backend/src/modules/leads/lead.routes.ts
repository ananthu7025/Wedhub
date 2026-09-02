import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as leadController from "./lead.controller";
import { createLeadNoteSchema, listLeadsQuerySchema, updateLeadStatusSchema } from "./lead.schema";

export const leadRouter = Router();

leadRouter.use(authenticateMiddleware);

leadRouter.get("/", validateQuery(listLeadsQuerySchema), asyncHandler(leadController.listOwnLeads));
leadRouter.get("/analytics", asyncHandler(leadController.getAnalytics));
leadRouter.get("/:id", asyncHandler(leadController.getOwnLead));
leadRouter.patch(
  "/:id/status",
  validateBody(updateLeadStatusSchema),
  asyncHandler(leadController.updateStatus),
);
leadRouter.post("/:id/notes", validateBody(createLeadNoteSchema), asyncHandler(leadController.addNote));

export const leadAdminRouter = Router();

leadAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

leadAdminRouter.get("/", validateQuery(listLeadsQuerySchema), asyncHandler(leadController.listAllLeadsAdmin));
leadAdminRouter.get("/:id", asyncHandler(leadController.getLeadAdmin));
leadAdminRouter.patch(
  "/:id/status",
  validateBody(updateLeadStatusSchema),
  asyncHandler(leadController.updateStatusAdmin),
);
