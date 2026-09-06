import type { Request, Response } from "express";
import { successResponse, paginatedResponse } from "../../common/utils/api-response.util";
import { AuthenticationError, NotFoundError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import { getVendorAnalytics } from "../entitlements/vendor-analytics.service";
import { getOwnedVendorOrThrow } from "./vendor.policy";
import * as vendorService from "./vendor.service";
import * as vendorRepository from "./vendor.repository";
import type {
  AttachServiceBody,
  CreatePackageBody,
  CreateVendorBody,
  ListVendorsQuery,
  SetAttributesBody,
  SetCategoriesBody,
  SetServiceAreasBody,
  UpdatePackageBody,
  UpdateVendorBody,
  UpsertProfileBody,
} from "./vendor.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createVendor(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateVendorBody;
  const vendor = await vendorService.createVendorForOwner(userId, { businessName: body.businessName });
  res.status(201).json(successResponse(vendor));
}

export async function getMyVendor(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  await vendorService.advanceIfEmailNowVerified(owned.id);
  const vendor = await vendorRepository.findVendorById(owned.id);
  res.json(successResponse(vendor));
}

export async function updateMyVendor(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as UpdateVendorBody;
  const vendor = await vendorService.updateOwnVendor(owned.id, { businessName: body.businessName });
  res.json(successResponse(vendor));
}

export async function upsertProfile(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as UpsertProfileBody;
  const profile = await vendorService.upsertProfile(owned.id, {
    shortDescription: body.shortDescription,
    description: body.description,
    vendorType: body.vendorType,
    tags: body.tags,
    address: body.address,
    latitude: body.latitude,
    longitude: body.longitude,
    startingPrice: body.startingPrice,
    priceRangeMin: body.priceRangeMin,
    priceRangeMax: body.priceRangeMax,
    currency: body.currency,
    customQuoteAvailable: body.customQuoteAvailable,
    yearsExperience: body.yearsExperience,
    teamSize: body.teamSize,
    languages: body.languages,
    travelPolicy: body.travelPolicy,
    website: body.website,
    phone: body.phone,
    email: body.email,
    socialLinks: body.socialLinks,
    businessHours: body.businessHours,
    availabilityNotes: body.availabilityNotes,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    canonicalUrl: body.canonicalUrl,
    cityId: body.cityId,
    logoMediaId: body.logoMediaId,
    coverMediaId: body.coverMediaId,
  });
  res.json(successResponse(profile));
}

export async function setCategories(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as SetCategoriesBody;
  const vendor = await vendorService.setCategories(owned.id, {
    primaryCategoryId: body.primaryCategoryId,
    subcategoryIds: body.subcategoryIds,
  });
  res.json(successResponse(vendor));
}

export async function setServiceAreas(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as SetServiceAreasBody;
  const vendor = await vendorService.setServiceAreas(owned.id, { locationIds: body.locationIds });
  res.json(successResponse(vendor));
}

export async function setAttributes(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as SetAttributesBody;
  const vendor = await vendorService.setAttributeValues(owned.id, body.values);
  res.json(successResponse(vendor));
}

export async function attachService(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as AttachServiceBody;
  const result = await vendorService.attachService(owned.id, body.serviceId, body.note);
  res.status(201).json(successResponse(result));
}

export async function detachService(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  await vendorService.detachService(owned.id, req.params.serviceId as string);
  res.json(successResponse({ detached: true }));
}

export async function createPackage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as CreatePackageBody;
  const pkg = await vendorService.createPackage(owned.id, {
    name: body.name,
    description: body.description,
    price: body.price,
    currency: body.currency,
    inclusions: body.inclusions,
    imageMediaId: body.imageMediaId,
  });
  res.status(201).json(successResponse(pkg));
}

export async function updatePackage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const body = req.body as UpdatePackageBody;
  const pkg = await vendorService.updatePackage(owned.id, req.params.packageId as string, {
    name: body.name,
    description: body.description,
    price: body.price,
    currency: body.currency,
    inclusions: body.inclusions,
    imageMediaId: body.imageMediaId,
    sortOrder: body.sortOrder,
    isActive: body.isActive,
  });
  res.json(successResponse(pkg));
}

export async function deletePackage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  await vendorService.deletePackage(owned.id, req.params.packageId as string);
  res.json(successResponse({ deleted: true }));
}

export async function submit(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const vendor = await vendorService.submitForReview(owned.id, userId);
  res.json(successResponse(vendor));
}

export async function getMyAnalytics(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const owned = await getOwnedVendorOrThrow(userId);
  const analytics = await getVendorAnalytics(owned.id);
  res.json(successResponse(analytics));
}

export async function getPublicVendor(req: Request, res: Response): Promise<void> {
  const vendor = await vendorRepository.findApprovedVendorBySlug(req.params.slug as string);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  // Feeds the vendor's own basic/advanced analytics view (Arch Phase 12) —
  // best-effort, never blocks the response (see logAnalyticsEvent).
  void logAnalyticsEvent({ userId: req.user?.id, eventType: "vendor_profile_viewed", vendorId: vendor.id });
  res.json(successResponse(vendor));
}

export async function listPublicVendors(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListVendorsQuery;
  const filter = { categoryId: query.categoryId, cityId: query.cityId };
  const [vendors, total] = await Promise.all([
    vendorRepository.listApprovedVendors({ ...filter, page: query.page, limit: query.limit }),
    vendorRepository.countApprovedVendors(filter),
  ]);
  res.json(
    paginatedResponse(vendors, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}
