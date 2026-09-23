import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as catalogService from "./catalog.service";
import type {
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
  SetAvailabilityInput,
  ClearAvailabilityInput,
  UpsertCatalogVariantFieldInput,
  ReorderCatalogVariantFieldsInput,
  ImportCatalogItemsInput,
  UpsertCatalogStoreSettingsInput,
} from "./catalog.types";

export async function listItems(req: Request, res: Response): Promise<void> {
  const items = await catalogService.listVendorCatalogItems(req.user!.id);
  res.json(successResponse(items));
}

export async function getItem(req: Request, res: Response): Promise<void> {
  const item = await catalogService.getVendorCatalogItem(req.user!.id, req.params.id as string);
  res.json(successResponse(item));
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateCatalogItemInput;
  const item = await catalogService.createCatalogItem(req.user!.id, input);
  res.status(201).json(successResponse(item));
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateCatalogItemInput;
  const item = await catalogService.updateCatalogItem(req.user!.id, req.params.id as string, input);
  res.json(successResponse(item));
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  const result = await catalogService.deleteCatalogItem(req.user!.id, req.params.id as string);
  res.json(successResponse(result));
}

export async function setAvailability(req: Request, res: Response): Promise<void> {
  const input = req.body as SetAvailabilityInput;
  const availability = await catalogService.setItemAvailability(req.user!.id, req.params.id as string, input);
  res.json(successResponse(availability));
}

export async function clearAvailability(req: Request, res: Response): Promise<void> {
  const input = req.body as ClearAvailabilityInput;
  const availability = await catalogService.clearItemAvailability(req.user!.id, req.params.id as string, input);
  res.json(successResponse(availability));
}

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query as { from?: string; to?: string };
  const availability = await catalogService.getItemAvailability(req.user!.id, req.params.id as string, from, to);
  res.json(successResponse(availability));
}

export async function getImportTemplate(req: Request, res: Response): Promise<void> {
  const { filename, csv } = await catalogService.getImportTemplate(req.user!.id);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

export async function importItems(req: Request, res: Response): Promise<void> {
  const input = req.body as ImportCatalogItemsInput;
  const result = await catalogService.importCatalogItems(req.user!.id, input);
  res.json(successResponse(result));
}

export async function getMyStoreSettings(req: Request, res: Response): Promise<void> {
  const settings = await catalogService.getVendorStoreSettings(req.user!.id);
  res.json(successResponse(settings));
}

export async function updateMyStoreSettings(req: Request, res: Response): Promise<void> {
  const input = req.body as UpsertCatalogStoreSettingsInput;
  const settings = await catalogService.updateVendorStoreSettings(req.user!.id, input);
  res.json(successResponse(settings));
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export async function listPublicItems(req: Request, res: Response): Promise<void> {
  const items = await catalogService.listPublicCatalogItems(req.params.slug as string);
  res.json(successResponse(items));
}

export async function getPublicAvailability(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query as { from?: string; to?: string };
  const availability = await catalogService.getPublicItemAvailability(req.params.id as string, from, to);
  res.json(successResponse(availability));
}

export async function getPublicStoreSettings(req: Request, res: Response): Promise<void> {
  const settings = await catalogService.getPublicStoreSettings(req.params.slug as string);
  res.json(successResponse(settings));
}

// ---------------------------------------------------------------------------
// Admin: per-category variant field configuration
// ---------------------------------------------------------------------------

export async function listVariantFields(req: Request, res: Response): Promise<void> {
  const fields = await catalogService.listVariantFields(req.params.categoryId as string);
  res.json(successResponse(fields));
}

export async function createVariantField(req: Request, res: Response): Promise<void> {
  const input = req.body as UpsertCatalogVariantFieldInput;
  const field = await catalogService.createVariantField(req.params.categoryId as string, input);
  res.status(201).json(successResponse(field));
}

export async function updateVariantField(req: Request, res: Response): Promise<void> {
  const input = req.body as Partial<UpsertCatalogVariantFieldInput>;
  const field = await catalogService.updateVariantField(req.params.fieldId as string, input);
  res.json(successResponse(field));
}

export async function deleteVariantField(req: Request, res: Response): Promise<void> {
  const result = await catalogService.deleteVariantField(req.params.fieldId as string);
  res.json(successResponse(result));
}

export async function reorderVariantFields(req: Request, res: Response): Promise<void> {
  const input = req.body as ReorderCatalogVariantFieldsInput;
  const fields = await catalogService.reorderVariantFields(req.params.categoryId as string, input);
  res.json(successResponse(fields));
}
