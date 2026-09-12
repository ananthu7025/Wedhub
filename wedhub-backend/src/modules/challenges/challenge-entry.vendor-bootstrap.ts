import type { Category, Challenge } from "@prisma/client";
import { prisma } from "../../config/database";
import { ValidationError } from "../../common/errors";
import { Role } from "../../common/enums/roles.enum";
import * as vendorService from "../vendors/vendor.service";
import { issueTokenPair } from "../auth/auth.service";
import type { RequestContext, TokenPair } from "../auth/auth.types";
import type { SubmitEntryBody } from "./challenge.schema";

export interface VendorBootstrapFields {
  businessName: string;
  shortDescription: string;
  cityId: string;
  startingPrice: number | undefined;
  customQuoteAvailable: boolean | undefined;
  contactPhone: string | undefined;
  contactEmail: string | undefined;
}

// A logged-in user with no vendor profile yet can submit a challenge entry
// directly — the submission form's fields double as the platform's real
// profile-completeness inputs (see vendor.completeness.ts's 11 weighted
// checks), so the artist leaves with a genuinely complete (not draft/thin)
// vendor profile, without ever being routed through the separate
// /vendor-onboarding wizard. This orchestrates the *existing* vendor
// creation building blocks (vendor.service.ts) with values mapped from the
// contest form — it is not a parallel/duplicate vendor-creation system.
export function extractBootstrapFields(body: SubmitEntryBody): VendorBootstrapFields | undefined {
  if (!body.businessName || !body.shortDescription || !body.cityId) {
    return undefined;
  }
  return {
    businessName: body.businessName,
    shortDescription: body.shortDescription,
    cityId: body.cityId,
    startingPrice: body.startingPrice,
    customQuoteAvailable: body.customQuoteAvailable,
    contactPhone: body.contactPhone,
    contactEmail: body.contactEmail,
  };
}

export interface BootstrapResult {
  vendorId: string;
  // Set only when the caller's User.role had to change (END_USER -> VENDOR)
  // to own a Vendor row — the frontend must swap in these fresh tokens,
  // since the caller's current access token still carries the old role.
  refreshedTokens: TokenPair | undefined;
}

export async function bootstrapVendorForChallenge(
  userId: string,
  challenge: Challenge,
  fields: VendorBootstrapFields,
  requestContext: RequestContext,
): Promise<BootstrapResult> {
  const category = await prisma.category.findUnique({
    where: { id: challenge.categoryId },
    include: { attributes: { orderBy: { sortOrder: "asc" } }, services: { where: { isActive: true }, take: 1 } },
  });
  if (!category) {
    throw new ValidationError("This challenge's category is no longer available");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let refreshedTokens: TokenPair | undefined;
  if (user.role !== Role.VENDOR) {
    // User.role is embedded in the JWT access token at issuance
    // (auth.service.ts's issueTokenPair), so flipping the DB row alone
    // would leave the caller's current token stale until their next
    // login/refresh. Mint a fresh pair now, same as vendor-claim's
    // claimByRegistering does for a brand-new vendor account, so the
    // frontend can swap it in immediately after this response.
    await prisma.user.update({ where: { id: userId }, data: { role: Role.VENDOR } });
    refreshedTokens = await issueTokenPair(userId, Role.VENDOR, requestContext);
  }

  const vendor = await vendorService.createVendorForOwner(userId, { businessName: fields.businessName });

  await vendorService.upsertProfile(vendor.id, {
    shortDescription: fields.shortDescription,
    description: fields.shortDescription,
    vendorType: undefined,
    tags: undefined,
    address: undefined,
    latitude: undefined,
    longitude: undefined,
    startingPrice: fields.startingPrice,
    priceRangeMin: undefined,
    priceRangeMax: undefined,
    currency: undefined,
    customQuoteAvailable: fields.customQuoteAvailable ?? fields.startingPrice === undefined,
    yearsExperience: undefined,
    teamSize: undefined,
    languages: undefined,
    travelPolicy: undefined,
    website: undefined,
    phone: fields.contactPhone,
    email: fields.contactEmail,
    socialLinks: undefined,
    businessHours: undefined,
    availabilityNotes: undefined,
    seoTitle: undefined,
    seoDescription: undefined,
    canonicalUrl: undefined,
    cityId: fields.cityId,
    logoMediaId: undefined,
    coverMediaId: undefined,
    willingToTravel: undefined,
    advanceBookingPercent: undefined,
    cancellationPolicy: undefined,
    eventsCompletedRange: undefined,
  });

  await vendorService.setCategories(vendor.id, { primaryCategoryId: challenge.categoryId, subcategoryIds: [] });
  await vendorService.setServiceAreas(vendor.id, { locationIds: [fields.cityId] });

  const defaultService = category.services[0];
  if (defaultService) {
    await vendorService.attachService(vendor.id, defaultService.id, undefined);
    // Only create a default package when the entrant actually supplied a
    // price — a persisted Package with price: 0 is indistinguishable from a
    // vendor who genuinely charges ₹0 once this profile is public (audit
    // rule: never invent a price).
    if (fields.startingPrice !== undefined) {
      await vendorService.createPackage(vendor.id, {
        name: defaultService.name,
        description: fields.shortDescription,
        price: fields.startingPrice,
        currency: undefined,
        inclusions: undefined,
        imageMediaId: undefined,
      });
    }
  }

  await attachSensibleAttributeDefaults(vendor.id, category);

  return { vendorId: vendor.id, refreshedTokens };
}

// Best-effort only: picks the first SELECT-type attribute's first option as
// a sensible starting default (e.g. Mehndi's "Style" -> "Bridal") so the
// completeness formula's "category attribute values" check is satisfied
// without asking the artist a form question about it. The artist can
// change this from their vendor dashboard later like any other vendor.
async function attachSensibleAttributeDefaults(vendorId: string, category: Category & { attributes: Array<{ id: string; dataType: string; options: unknown }> }): Promise<void> {
  const selectAttribute = category.attributes.find((a) => a.dataType === "SELECT");
  if (!selectAttribute) {
    return;
  }
  const options = (selectAttribute.options as string[] | null) ?? [];
  if (options.length === 0) {
    return;
  }
  await vendorService.setAttributeValues(vendorId, [{ attributeId: selectAttribute.id, value: options[0] as string }]);
}
