import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError, NotFoundError } from "../../common/errors";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as vendorRepository from "../vendors/vendor.repository";
import * as albumService from "./album.service";
import type { CreateAlbumBody, UpdateAlbumBody } from "./album.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createAlbum(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as CreateAlbumBody;
  const album = await albumService.createAlbum(vendor.id, {
    name: body.name,
    description: body.description,
    visibility: body.visibility,
  });
  res.status(201).json(successResponse(album));
}

export async function listOwnAlbums(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const albums = await albumService.listOwnAlbums(vendor.id);
  res.json(successResponse(albums));
}

export async function updateAlbum(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as UpdateAlbumBody;
  const album = await albumService.updateAlbum(vendor.id, req.params.id as string, {
    name: body.name,
    description: body.description,
    coverMediaId: body.coverMediaId,
    visibility: body.visibility,
    sortOrder: body.sortOrder,
  });
  res.json(successResponse(album));
}

export async function deleteAlbum(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  await albumService.deleteAlbum(vendor.id, req.params.id as string);
  res.json(successResponse({ deleted: true }));
}

export async function listPublicAlbums(req: Request, res: Response): Promise<void> {
  const vendor = await vendorRepository.findApprovedVendorBySlug(req.params.slug as string);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  const albums = await albumService.listPublicAlbums(vendor.id);
  res.json(successResponse(albums));
}
