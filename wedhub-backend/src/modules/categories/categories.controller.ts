import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as categoriesService from "./categories.service";
import type {
  CreateAttributeBody,
  CreateCategoryBody,
  CreateServiceBody,
  UpdateAttributeBody,
  UpdateCategoryBody,
  UpdateServiceBody,
} from "./categories.schema";

export async function listCategories(req: Request, res: Response): Promise<void> {
  // includeInactive is only honored for an authenticated ADMIN — anyone
  // else gets the normal isActive:true list regardless of what they pass,
  // so this stays a safe no-op for the public/couple/vendor callers this
  // route already serves.
  const includeInactive = req.query.includeInactive === "true" && req.user?.role === "ADMIN";
  const categories = includeInactive ? await categoriesService.listAllCategoriesForAdmin() : await categoriesService.listCategories();
  res.json(successResponse(categories));
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const category = await categoriesService.getCategoryBySlug(req.params.slug as string);
  res.json(successResponse(category));
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateCategoryBody;
  const category = await categoriesService.createCategory({
    name: body.name,
    description: body.description,
    parentId: body.parentId,
    hasStoreEnabled: body.hasStoreEnabled,
  });
  res.status(201).json(successResponse(category));
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateCategoryBody;
  const category = await categoriesService.updateCategory(req.params.id as string, {
    name: body.name,
    description: body.description,
    sortOrder: body.sortOrder,
    isActive: body.isActive,
    hasStoreEnabled: body.hasStoreEnabled,
    imageUrl: body.imageUrl,
    isFeaturedOnHomepage: body.isFeaturedOnHomepage,
    homepageSortOrder: body.homepageSortOrder,
    startingPriceLabel: body.startingPriceLabel,
  });
  res.json(successResponse(category));
}

// Public — backs the homepage category carousel/bento grid with real,
// admin-curated categories (see categoriesService.listFeaturedCategories).
export async function listFeaturedCategories(_req: Request, res: Response): Promise<void> {
  const categories = await categoriesService.listFeaturedCategories();
  res.json(successResponse(categories));
}

export async function createAttribute(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateAttributeBody;
  const attribute = await categoriesService.createAttribute(req.params.id as string, {
    key: body.key,
    label: body.label,
    dataType: body.dataType,
    options: body.options,
    isFilterable: body.isFilterable,
    isComparable: body.isComparable,
  });
  res.status(201).json(successResponse(attribute));
}

export async function updateAttribute(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateAttributeBody;
  const attribute = await categoriesService.updateAttribute(req.params.attributeId as string, {
    label: body.label,
    options: body.options,
    isFilterable: body.isFilterable,
    isComparable: body.isComparable,
    sortOrder: body.sortOrder,
  });
  res.json(successResponse(attribute));
}

export async function deleteAttribute(req: Request, res: Response): Promise<void> {
  await categoriesService.deleteAttribute(req.params.attributeId as string);
  res.json(successResponse({ deleted: true }));
}

export async function createService(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateServiceBody;
  const service = await categoriesService.createService(req.params.id as string, {
    name: body.name,
    description: body.description,
  });
  res.status(201).json(successResponse(service));
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateServiceBody;
  const service = await categoriesService.updateService(req.params.serviceId as string, {
    name: body.name,
    description: body.description,
    isActive: body.isActive,
  });
  res.json(successResponse(service));
}

export async function deleteService(req: Request, res: Response): Promise<void> {
  await categoriesService.deleteService(req.params.serviceId as string);
  res.json(successResponse({ deleted: true }));
}
