import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as enquiryService from "./enquiry.service";
import type { CreateMultiVendorEnquiryBody, CreateSingleVendorEnquiryBody, ListMyEnquiriesQuery } from "./enquiry.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createSingleVendorEnquiry(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateSingleVendorEnquiryBody;
  const result = await enquiryService.createSingleVendorEnquiry(req.user?.id, {
    vendorId: body.vendorId,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    preferredContactMethod: body.preferredContactMethod,
    weddingDate: body.weddingDate,
    weddingLocation: body.weddingLocation,
    serviceId: body.serviceId,
    budget: body.budget,
    guestCount: body.guestCount,
    message: body.message,
  });
  res.status(201).json(successResponse(result));
}

export async function listMyEnquiries(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const query = req.validatedQuery as ListMyEnquiriesQuery;
  const [enquiries, total] = await enquiryService.listMyEnquiries(userId, query.page, query.limit);
  res.json(
    paginatedResponse(enquiries, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function createMultiVendorEnquiry(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateMultiVendorEnquiryBody;
  const result = await enquiryService.createMultiVendorEnquiry(req.user?.id, {
    categoryId: body.categoryId,
    cityId: body.cityId,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    preferredContactMethod: body.preferredContactMethod,
    weddingDate: body.weddingDate,
    weddingLocation: body.weddingLocation,
    serviceId: body.serviceId,
    budget: body.budget,
    guestCount: body.guestCount,
    message: body.message,
  });
  res.status(201).json(successResponse(result));
}
