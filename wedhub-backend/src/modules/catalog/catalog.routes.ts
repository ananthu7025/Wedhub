import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as controller from "./catalog.controller";
import {
  clearAvailabilitySchema,
  createCatalogCollectionSchema,
  createCatalogItemSchema,
  importCatalogItemsSchema,
  reorderCatalogCollectionsSchema,
  reorderCatalogVariantFieldsSchema,
  setAvailabilitySchema,
  updateCatalogCollectionSchema,
  updateCatalogItemSchema,
  upsertCatalogStoreSettingsSchema,
  upsertCatalogVariantFieldSchema,
} from "./catalog.schema";

export const catalogRouter = Router();
export const publicCatalogRouter = Router();
export const catalogVariantFieldAdminRouter = Router();

// ---------------------------------------------------------------------------
// Vendor Authenticated Endpoints: /api/v1/catalog/me/*
// ---------------------------------------------------------------------------
catalogRouter.use(authenticateMiddleware, authorize(Role.VENDOR));

catalogRouter.get("/me/items", asyncHandler(controller.listItems));
catalogRouter.post("/me/items", validateBody(createCatalogItemSchema), asyncHandler(controller.createItem));
catalogRouter.get("/me/items/:id", asyncHandler(controller.getItem));
catalogRouter.put("/me/items/:id", validateBody(updateCatalogItemSchema), asyncHandler(controller.updateItem));
catalogRouter.delete("/me/items/:id", asyncHandler(controller.deleteItem));

catalogRouter.get("/me/items/:id/availability", asyncHandler(controller.getAvailability));
catalogRouter.post(
  "/me/items/:id/availability",
  validateBody(setAvailabilitySchema),
  asyncHandler(controller.setAvailability),
);
catalogRouter.post(
  "/me/items/:id/availability/clear",
  validateBody(clearAvailabilitySchema),
  asyncHandler(controller.clearAvailability),
);

catalogRouter.get("/me/import-template", asyncHandler(controller.getImportTemplate));
catalogRouter.post("/me/items/import", validateBody(importCatalogItemsSchema), asyncHandler(controller.importItems));

catalogRouter.get("/me/settings", asyncHandler(controller.getMyStoreSettings));
catalogRouter.put(
  "/me/settings",
  validateBody(upsertCatalogStoreSettingsSchema),
  asyncHandler(controller.updateMyStoreSettings),
);

catalogRouter.get("/me/collections", asyncHandler(controller.listCollections));
catalogRouter.post(
  "/me/collections",
  validateBody(createCatalogCollectionSchema),
  asyncHandler(controller.createCollection),
);
catalogRouter.patch(
  "/me/collections/:id",
  validateBody(updateCatalogCollectionSchema),
  asyncHandler(controller.updateCollection),
);
catalogRouter.delete("/me/collections/:id", asyncHandler(controller.deleteCollection));
catalogRouter.put(
  "/me/collections/reorder",
  validateBody(reorderCatalogCollectionsSchema),
  asyncHandler(controller.reorderCollections),
);

// ---------------------------------------------------------------------------
// Public Endpoints: /api/v1/catalog/*
// ---------------------------------------------------------------------------
publicCatalogRouter.get("/vendors/:slug/items", asyncHandler(controller.listPublicItems));
publicCatalogRouter.get("/items/:id/availability", asyncHandler(controller.getPublicAvailability));
publicCatalogRouter.get("/vendors/:slug/settings", asyncHandler(controller.getPublicStoreSettings));
publicCatalogRouter.get("/vendors/:slug/collections", asyncHandler(controller.listPublicCollections));

// ---------------------------------------------------------------------------
// Admin: /api/v1/admin/categories/:categoryId/catalog-variant-fields
// Same admin-configured-per-category pattern as Category Details attributes
// (categories.routes.ts) — kept in this module rather than categories/ so
// the catalog feature stays self-contained.
// ---------------------------------------------------------------------------
catalogVariantFieldAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

catalogVariantFieldAdminRouter.get("/:categoryId/catalog-variant-fields", asyncHandler(controller.listVariantFields));
catalogVariantFieldAdminRouter.post(
  "/:categoryId/catalog-variant-fields",
  validateBody(upsertCatalogVariantFieldSchema),
  asyncHandler(controller.createVariantField),
);
catalogVariantFieldAdminRouter.patch(
  "/:categoryId/catalog-variant-fields/:fieldId",
  validateBody(upsertCatalogVariantFieldSchema.partial()),
  asyncHandler(controller.updateVariantField),
);
catalogVariantFieldAdminRouter.delete(
  "/:categoryId/catalog-variant-fields/:fieldId",
  asyncHandler(controller.deleteVariantField),
);
catalogVariantFieldAdminRouter.put(
  "/:categoryId/catalog-variant-fields/reorder",
  validateBody(reorderCatalogVariantFieldsSchema),
  asyncHandler(controller.reorderVariantFields),
);
