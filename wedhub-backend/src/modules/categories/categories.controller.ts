import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as categoriesService from "./categories.service";
import type {
  CreateAttributeBody,
  CreateCategoryBody,
  UpdateAttributeBody,
  UpdateCategoryBody,
} from "./categories.schema";

export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await categoriesService.listCategories();
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
  });
  res.json(successResponse(category));
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
