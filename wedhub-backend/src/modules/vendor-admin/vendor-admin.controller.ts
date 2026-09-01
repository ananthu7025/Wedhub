import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import { omitUndefined } from "../../common/utils/object.util";
import * as vendorAdminService from "./vendor-admin.service";
import type {
  AdminCreateVendorBody,
  AdminUpdateVendorBody,
  CreateInvitationBody,
  ListAdminVendorsQuery,
  RejectVendorBody,
  SetVerificationBody,
  SuspendVendorBody,
} from "./vendor-admin.schema";

function requireAdminId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createVendor(req: Request, res: Response): Promise<void> {
  const body = req.body as AdminCreateVendorBody;
  const vendor = await vendorAdminService.createAdminVendor({ businessName: body.businessName });
  res.status(201).json(successResponse(vendor));
}

export async function createInvitation(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const body = req.body as CreateInvitationBody;
  const invitation = await vendorAdminService.createInvitation(
    req.params.id as string,
    adminId,
    body.invitedEmail,
  );
  res.status(201).json(
    successResponse({
      id: invitation.id,
      vendorId: invitation.vendorId,
      expiresAt: invitation.expiresAt,
    }),
  );
}

export async function listVendors(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListAdminVendorsQuery;
  const { vendors, total } = await vendorAdminService.listVendors({
    status: query.status,
    verificationLevel: query.verificationLevel,
    categoryId: query.categoryId,
    cityId: query.cityId,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(vendors, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function getVendorDetail(req: Request, res: Response): Promise<void> {
  const vendor = await vendorAdminService.getVendorDetail(req.params.id as string);
  res.json(successResponse(vendor));
}

export async function updateVendor(req: Request, res: Response): Promise<void> {
  const body = req.body as AdminUpdateVendorBody;
  const fields = omitUndefined({
    businessName: body.businessName,
    slug: body.slug,
    cityId: body.cityId,
  });
  const vendor = await vendorAdminService.adminUpdateVendor(req.params.id as string, fields);
  res.json(successResponse(vendor));
}

export async function setVerification(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const body = req.body as SetVerificationBody;
  const vendor = await vendorAdminService.setVerificationLevel(
    req.params.id as string,
    adminId,
    body.verificationLevel,
  );
  res.json(successResponse(vendor));
}

export async function approve(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const vendor = await vendorAdminService.approveVendor(req.params.id as string, adminId);
  res.json(successResponse(vendor));
}

export async function reject(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const body = req.body as RejectVendorBody;
  const vendor = await vendorAdminService.rejectVendor(req.params.id as string, adminId, body.reason);
  res.json(successResponse(vendor));
}

export async function suspend(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const body = req.body as SuspendVendorBody;
  const vendor = await vendorAdminService.suspendVendor(req.params.id as string, adminId, body.reason);
  res.json(successResponse(vendor));
}

export async function restore(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const vendor = await vendorAdminService.restoreVendor(req.params.id as string, adminId);
  res.json(successResponse(vendor));
}

export async function deactivate(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const vendor = await vendorAdminService.deactivateVendor(req.params.id as string, adminId);
  res.json(successResponse(vendor));
}

export async function getStatusHistory(req: Request, res: Response): Promise<void> {
  const history = await vendorAdminService.getStatusHistory(req.params.id as string);
  res.json(successResponse(history));
}
