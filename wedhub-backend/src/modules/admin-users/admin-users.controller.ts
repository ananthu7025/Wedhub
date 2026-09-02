import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as adminUsersService from "./admin-users.service";
import type { ListUsersQuery, SuspendUserBody } from "./admin-users.schema";

function requireAdminId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListUsersQuery;
  const [users, total] = await adminUsersService.listUsers({
    status: query.status,
    role: query.role,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(users, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }),
  );
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await adminUsersService.getUser(req.params.id as string);
  res.json(successResponse(user));
}

export async function suspendUser(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const body = req.body as SuspendUserBody;
  const user = await adminUsersService.suspendUser(req.params.id as string, adminId, body.reason);
  res.json(successResponse(user));
}

export async function restoreUser(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const user = await adminUsersService.restoreUser(req.params.id as string, adminId);
  res.json(successResponse(user));
}
