import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as locationsService from "./locations.service";
import type { CreateLocationBody, ListLocationsQuery, UpdateLocationBody } from "./locations.schema";

export async function listLocations(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListLocationsQuery;
  const locations = await locationsService.listLocations({
    type: query.type,
    parentId: query.parentId,
  });
  res.json(successResponse(locations));
}

export async function createLocation(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateLocationBody;
  const location = await locationsService.createLocation({
    type: body.type,
    name: body.name,
    parentId: body.parentId,
  });
  res.status(201).json(successResponse(location));
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateLocationBody;
  const location = await locationsService.updateLocation(req.params.id as string, {
    name: body.name,
    isActive: body.isActive,
  });
  res.json(successResponse(location));
}
