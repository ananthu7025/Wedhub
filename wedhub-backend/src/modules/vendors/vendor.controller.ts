import type { Request, Response } from "express";
import { successResponse, paginatedResponse } from "../../common/utils/api-response.util";
import { AuthenticationError, NotFoundError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import { getVendorAnalytics } from "../entitlements/vendor-analytics.service";
import { getOwnedVendorOrThrow } from "./vendor.policy";
import * as vendorService from "./vendor.service";
import * as vendorRepository from "./vendor.repository";
import type {
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
  // IMAGE-typed attribute values only store a Media id (valueText, same EAV
  // shape as every other type) — resolve those to full Media rows here so
  // ProfileEditor's AttributesSection can render an existing image preview
  // without a separate round trip per field.
  const mediaByAttributeId = vendor ? await vendorService.resolveImageAttributeMedia(vendor.attributeValues) : {};
  res.json(successResponse(vendor ? { ...vendor, mediaByAttributeId } : vendor));
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
    willingToTravel: body.willingToTravel,
    advanceBookingPercent: body.advanceBookingPercent,
    cancellationPolicy: body.cancellationPolicy,
    eventsCompletedRange: body.eventsCompletedRange,
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

// Contact fields (phone/email/website) are never sent in the public vendor
// payload — a browser inspecting the page source or network response can't
// read them just because the profile page loaded. They're only returned by
// the separate revealVendorContact endpoint below, which requires an
// explicit reveal action and logs it server-side as a stronger-intent
// signal (contact_details_revealed) than a plain view. `hasContactInfo`
// tells the frontend whether to render the "Reveal contact details" button
// at all, without leaking which fields are actually set.
function redactContactFields<
  T extends { profile: { phone: string | null; email: string | null; website: string | null } | null },
>(vendor: T): T & { profile: (T["profile"] & { hasContactInfo: boolean }) | null } {
  if (!vendor.profile) return { ...vendor, profile: null };
  const hasContactInfo = Boolean(vendor.profile.phone || vendor.profile.email || vendor.profile.website);
  return { ...vendor, profile: { ...vendor.profile, phone: null, email: null, website: null, hasContactInfo } };
}

export async function getPublicVendor(req: Request, res: Response): Promise<void> {
  const vendor = await vendorRepository.findApprovedVendorBySlug(req.params.slug as string);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  // Feeds the vendor's own basic/advanced analytics view (Arch Phase 12) —
  // best-effort, never blocks the response (see logAnalyticsEvent).
  void logAnalyticsEvent({ userId: req.user?.id, eventType: "vendor_profile_viewed", vendorId: vendor.id });
  res.json(successResponse(redactContactFields(vendor)));
}

// Explicit "Reveal contact details" action from the public profile —
// requires a logged-in couple (anonymous visitors have no identity to
// attribute the reveal to, and the button is only rendered for logged-in
// couples). Logs contact_details_revealed server-side so a vendor's
// "Recent profile viewers" list can distinguish a real contact reveal from
// a plain page view (see lead.repository.ts::listProfileViewers) — logged
// here rather than trusted from a client-fired analytics beacon, since this
// signal directly gates access to real contact info.
export async function revealVendorContact(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await vendorRepository.findApprovedVendorBySlug(req.params.slug as string);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  void logAnalyticsEvent({ userId, eventType: "contact_details_revealed", vendorId: vendor.id });
  res.json(
    successResponse({
      phone: vendor.profile?.phone ?? null,
      email: vendor.profile?.email ?? null,
      website: vendor.profile?.website ?? null,
    }),
  );
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
