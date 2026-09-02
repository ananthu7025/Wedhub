import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as adminRolesService from "./admin-roles.service";

export async function listRoles(_req: Request, res: Response): Promise<void> {
  const roles = await adminRolesService.listRoles();
  res.json(successResponse(roles));
}

export async function listPermissions(_req: Request, res: Response): Promise<void> {
  const permissions = await adminRolesService.listPermissions();
  res.json(successResponse(permissions));
}

export async function listAdminUsers(_req: Request, res: Response): Promise<void> {
  const adminUsers = await adminRolesService.listAdminUsers();
  res.json(successResponse(adminUsers));
}
