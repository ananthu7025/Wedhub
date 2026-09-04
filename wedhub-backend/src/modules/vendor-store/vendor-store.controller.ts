import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as storeService from "./vendor-store.service";
import type {
  CreateStoreItemInput,
  PublicCreateOrderInput,
  UpdateOrderStatusInput,
  UpdateStoreItemInput,
  UpsertStoreProfileInput,
} from "./vendor-store.types";
import type { StoreOrderStatus } from "@prisma/client";

export async function getStoreProfile(req: Request, res: Response): Promise<void> {
  const profile = await storeService.getVendorStoreProfile(req.user!.id);
  res.json(successResponse(profile));
}

export async function updateStoreProfile(req: Request, res: Response): Promise<void> {
  const input = req.body as UpsertStoreProfileInput;
  const updated = await storeService.updateVendorStoreProfile(req.user!.id, input);
  res.json(successResponse(updated));
}

export async function listStoreItems(req: Request, res: Response): Promise<void> {
  const items = await storeService.listVendorStoreItems(req.user!.id);
  res.json(successResponse(items));
}

export async function createStoreItem(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateStoreItemInput;
  const item = await storeService.createStoreItem(req.user!.id, input);
  res.status(201).json(successResponse(item));
}

export async function updateStoreItem(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateStoreItemInput;
  const item = await storeService.updateStoreItem(req.user!.id, req.params.id as string, input);
  res.json(successResponse(item));
}

export async function deleteStoreItem(req: Request, res: Response): Promise<void> {
  const result = await storeService.deleteStoreItem(req.user!.id, req.params.id as string);
  res.json(successResponse(result));
}

export async function listStoreOrders(req: Request, res: Response): Promise<void> {
  const status = req.query.status as StoreOrderStatus | undefined;
  const orders = await storeService.listVendorStoreOrders(req.user!.id, status);
  res.json(successResponse(orders));
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateOrderStatusInput;
  const updated = await storeService.updateStoreOrderStatus(req.user!.id, req.params.id as string, input);
  res.json(successResponse(updated));
}

export async function createOrderInvoice(req: Request, res: Response): Promise<void> {
  const result = await storeService.createOrderInvoice(req.user!.id, req.params.id as string);
  res.status(201).json(successResponse(result));
}

// ---------------------------------------------------------------------------
// Public Storefront Controllers
// ---------------------------------------------------------------------------

export async function getPublicStore(req: Request, res: Response): Promise<void> {
  const store = await storeService.getPublicStoreBySlug(req.params.slug as string);
  res.json(successResponse(store));
}

export async function listPublicStoreItems(req: Request, res: Response): Promise<void> {
  const items = await storeService.listPublicStoreItems(req.params.slug as string);
  res.json(successResponse(items));
}

export async function createPublicOrder(req: Request, res: Response): Promise<void> {
  const input = req.body as PublicCreateOrderInput;
  const result = await storeService.createPublicStoreOrder(req.params.slug as string, input);
  res.status(201).json(successResponse(result));
}
