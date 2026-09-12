import { z } from "zod";
import { prisma } from "../../config/database";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import { logger } from "../../config/logger";
import * as vendorRepository from "./vendor.repository";
import { calculateCompleteness, missingRequiredForSubmission } from "./vendor.completeness";
import type {
  AttributeValueInput,
  CompletenessResult,
  CreatePackageInput,
  CreateVendorInput,
  SetCategoriesInput,
  SetServiceAreasInput,
  UpdatePackageInput,
  UpdateVendorInput,
  UpsertVendorProfileInput,
} from "./vendor.types";

export async function recalculateCompleteness(vendorId: string): Promise<CompletenessResult> {
  const vendor = await vendorRepository.findVendorForCompleteness(vendorId);
  const result = calculateCompleteness(vendor);
  await vendorRepository.updateProfileCompleteness(vendorId, result.score);
  return result;
}

export async function createVendorForOwner(ownerUserId: string, input: CreateVendorInput) {
  const existing = await vendorRepository.findVendorByOwnerId(ownerUserId);
  if (existing) {
    throw new ConflictError("You already have a vendor profile");
  }

  const slug = await generateUniqueSlug(slugify(input.businessName), async (candidate) =>
    Boolean(await vendorRepository.findVendorBySlugAnyCase(candidate)),
  );
  const vendor = await vendorRepository.createVendor({
    businessName: input.businessName,
    slug,
    creationSource: "SELF_REGISTERED",
    ownerUserId,
  });

  await vendorRepository.recordStatusChange({
    vendorId: vendor.id,
    fromStatus: null,
    toStatus: "DRAFT",
    reason: undefined,
    changedByUserId: ownerUserId,
  });

  return vendor;
}

export async function updateOwnVendor(vendorId: string, input: UpdateVendorInput) {
  // Slug is intentionally never derived from businessName here — it is frozen
  // once a vendor leaves DRAFT (see vendor-admin's explicit slug-change endpoint).
  return vendorRepository.updateVendor(vendorId, { businessName: input.businessName, cityId: undefined });
}

async function assertOwnReadyMediaOrNull(
  vendorId: string,
  mediaId: string | null | undefined,
  fieldLabel = "logoMediaId/coverMediaId",
): Promise<void> {
  if (mediaId === null || mediaId === undefined) {
    return;
  }
  const media = await vendorRepository.findOwnMediaById(vendorId, mediaId);
  if (!media || media.status !== "READY") {
    throw new ValidationError(`${fieldLabel} must reference your own, fully-processed media`);
  }
}

export async function upsertProfile(vendorId: string, input: UpsertVendorProfileInput) {
  const { cityId, logoMediaId, coverMediaId, ...profileFields } = input;

  await Promise.all([
    assertOwnReadyMediaOrNull(vendorId, logoMediaId),
    assertOwnReadyMediaOrNull(vendorId, coverMediaId),
  ]);

  const results = await vendorRepository.upsertProfileTx(vendorId, cityId, {
    ...profileFields,
    logoMediaId,
    coverMediaId,
  });
  const profile = results[results.length - 1];

  await recalculateCompleteness(vendorId);
  return profile;
}

export async function setCategories(vendorId: string, input: SetCategoriesInput) {
  const currentPrimary = await vendorRepository.getCurrentPrimaryCategoryId(vendorId);
  const primaryChanged = currentPrimary != null && currentPrimary.categoryId !== input.primaryCategoryId;

  await vendorRepository.replaceVendorCategories(vendorId, input.primaryCategoryId, input.subcategoryIds);

  if (primaryChanged) {
    const vendor = await vendorRepository.findVendorById(vendorId);
    if (vendor?.status === "APPROVED") {
      await vendorRepository.changeStatusWithAuditLogTx({
        vendorId,
        fromStatus: "APPROVED",
        toStatus: "PENDING_APPROVAL",
        reason: "Primary category changed — re-review required",
        auditAction: "VENDOR_PRIMARY_CATEGORY_CHANGED",
      });
    }
  }

  await recalculateCompleteness(vendorId);
  return vendorRepository.findVendorById(vendorId);
}

export async function setServiceAreas(vendorId: string, input: SetServiceAreasInput) {
  await vendorRepository.replaceVendorServiceAreas(vendorId, input.locationIds);
  await recalculateCompleteness(vendorId);
  return vendorRepository.findVendorById(vendorId);
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s\-()]{6,19}$/;

function isNumberRangeValue(value: unknown): value is { min: number; max: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { min: unknown }).min === "number" &&
    typeof (value as { max: unknown }).max === "number"
  );
}

function isTimeValue(value: unknown): value is { time: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && typeof (value as { time: unknown }).time === "string";
}

function isTimeRangeValue(value: unknown): value is { start: string; end: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { start: unknown }).start === "string" &&
    typeof (value as { end: unknown }).end === "string"
  );
}

export async function setAttributeValues(vendorId: string, values: AttributeValueInput[]) {
  const attributes = await vendorRepository.findAttributesByIds(values.map((v) => v.attributeId));
  const attributeById = new Map(attributes.map((attribute) => [attribute.id, attribute]));

  const rows: vendorRepository.AttributeValueRow[] = [];
  for (const entry of values) {
    const attribute = attributeById.get(entry.attributeId);
    if (!attribute) {
      throw new ValidationError(`Attribute ${entry.attributeId} does not exist`);
    }

    const write: vendorRepository.AttributeValueRow = {
      attributeId: entry.attributeId,
      valueText: undefined,
      valueNumber: undefined,
      valueBoolean: undefined,
      valueOptions: undefined,
      valueJson: undefined,
    };

    switch (attribute.dataType) {
      case "TEXT":
      case "TEXTAREA":
      case "SELECT": {
        if (typeof entry.value !== "string") {
          throw new ValidationError(`Attribute "${attribute.label}" expects a text value`);
        }
        if (attribute.dataType === "SELECT") {
          const options = (attribute.options as string[] | null) ?? [];
          if (!options.includes(entry.value)) {
            throw new ValidationError(`"${entry.value}" is not a valid option for "${attribute.label}"`);
          }
        }
        write.valueText = entry.value;
        break;
      }
      case "PHONE": {
        if (typeof entry.value !== "string" || !PHONE_PATTERN.test(entry.value)) {
          throw new ValidationError(`Attribute "${attribute.label}" expects a valid phone number`);
        }
        write.valueText = entry.value;
        break;
      }
      case "EMAIL": {
        if (typeof entry.value !== "string" || !z.string().email().safeParse(entry.value).success) {
          throw new ValidationError(`Attribute "${attribute.label}" expects a valid email address`);
        }
        write.valueText = entry.value;
        break;
      }
      case "URL": {
        if (typeof entry.value !== "string" || !z.string().url().safeParse(entry.value).success) {
          throw new ValidationError(`Attribute "${attribute.label}" expects a valid URL`);
        }
        write.valueText = entry.value;
        break;
      }
      case "IMAGE": {
        if (typeof entry.value !== "string") {
          throw new ValidationError(`Attribute "${attribute.label}" expects an uploaded image`);
        }
        const media = await vendorRepository.findOwnMediaById(vendorId, entry.value);
        if (!media || media.status !== "READY") {
          throw new ValidationError(`Attribute "${attribute.label}" must reference your own, fully-processed image`);
        }
        write.valueText = entry.value;
        break;
      }
      case "NUMBER": {
        if (typeof entry.value !== "number") {
          throw new ValidationError(`Attribute "${attribute.label}" expects a numeric value`);
        }
        write.valueNumber = entry.value;
        break;
      }
      case "NUMBER_RANGE": {
        if (!isNumberRangeValue(entry.value) || !Number.isFinite(entry.value.min) || !Number.isFinite(entry.value.max)) {
          throw new ValidationError(`Attribute "${attribute.label}" expects a numeric range ({min, max})`);
        }
        if (entry.value.min > entry.value.max) {
          throw new ValidationError(`Attribute "${attribute.label}": min must not be greater than max`);
        }
        write.valueJson = entry.value;
        break;
      }
      case "TIME": {
        if (!isTimeValue(entry.value) || !TIME_PATTERN.test(entry.value.time)) {
          throw new ValidationError(`Attribute "${attribute.label}" expects a valid time (HH:mm)`);
        }
        write.valueJson = entry.value;
        break;
      }
      case "TIME_RANGE": {
        if (
          !isTimeRangeValue(entry.value) ||
          !TIME_PATTERN.test(entry.value.start) ||
          !TIME_PATTERN.test(entry.value.end)
        ) {
          throw new ValidationError(`Attribute "${attribute.label}" expects a valid time range (start/end, HH:mm)`);
        }
        if (entry.value.start >= entry.value.end) {
          throw new ValidationError(`Attribute "${attribute.label}": start time must be before end time`);
        }
        write.valueJson = entry.value;
        break;
      }
      case "BOOLEAN": {
        if (typeof entry.value !== "boolean") {
          throw new ValidationError(`Attribute "${attribute.label}" expects a boolean value`);
        }
        write.valueBoolean = entry.value;
        break;
      }
      case "MULTI_SELECT": {
        if (!Array.isArray(entry.value)) {
          throw new ValidationError(`Attribute "${attribute.label}" expects a list of options`);
        }
        const options = (attribute.options as string[] | null) ?? [];
        const invalid = entry.value.filter((v) => !options.includes(v));
        if (invalid.length > 0) {
          throw new ValidationError(
            `Invalid options for "${attribute.label}": ${invalid.join(", ")}`,
          );
        }
        write.valueOptions = entry.value;
        break;
      }
    }

    rows.push(write);
  }

  const requiredAttributes = await vendorRepository.findRequiredAttributesForPrimaryCategory(vendorId);
  const submittedById = new Map(rows.map((row) => [row.attributeId, row]));
  const missingLabels = requiredAttributes
    .filter((attribute) => !isAttributeValuePresent(submittedById.get(attribute.id)))
    .map((attribute) => attribute.label);
  if (missingLabels.length > 0) {
    throw new ValidationError(`Missing required field(s): ${missingLabels.join(", ")}`);
  }

  await vendorRepository.replaceAttributeValues(vendorId, rows);
  await recalculateCompleteness(vendorId);
  return vendorRepository.findVendorById(vendorId);
}

function isAttributeValuePresent(row: vendorRepository.AttributeValueRow | undefined): boolean {
  if (!row) {
    return false;
  }
  if (row.valueText !== undefined) {
    return row.valueText.length > 0;
  }
  if (row.valueOptions !== undefined) {
    return row.valueOptions.length > 0;
  }
  if (row.valueJson !== undefined) {
    const json = row.valueJson as { min?: number; max?: number; time?: string; start?: string; end?: string };
    if (json.min !== undefined || json.max !== undefined) {
      return json.min !== undefined && json.max !== undefined;
    }
    if (json.time !== undefined) {
      return json.time.length > 0;
    }
    if (json.start !== undefined || json.end !== undefined) {
      return !!json.start && !!json.end;
    }
    return true;
  }
  return row.valueNumber !== undefined || row.valueBoolean !== undefined;
}

// Resolves the Media row behind each IMAGE-typed attribute value's valueText
// (a Media id) so the frontend can render an existing image preview without
// a per-field round trip. Keyed by attributeId since that's what
// AttributesSection/ProfileEditor already key their value map on.
export async function resolveImageAttributeMedia(
  attributeValues: Array<{ attributeId: string; valueText: string | null; attribute: { dataType: string } }>,
) {
  const imageMediaIds = attributeValues
    .filter((av) => av.attribute.dataType === "IMAGE" && av.valueText)
    .map((av) => av.valueText as string);
  if (imageMediaIds.length === 0) {
    return {};
  }

  const mediaRows = await vendorRepository.findMediaByIds(imageMediaIds);
  const mediaById = new Map(mediaRows.map((m) => [m.id, m]));

  const result: Record<string, (typeof mediaRows)[number]> = {};
  for (const av of attributeValues) {
    if (av.attribute.dataType === "IMAGE" && av.valueText) {
      const media = mediaById.get(av.valueText);
      if (media) {
        result[av.attributeId] = media;
      }
    }
  }
  return result;
}

export async function createPackage(vendorId: string, input: CreatePackageInput) {
  await assertOwnReadyMediaOrNull(vendorId, input.imageMediaId, "imageMediaId");
  const pkg = await vendorRepository.createPackage(vendorId, input);
  await recalculateCompleteness(vendorId);
  return pkg;
}

export async function updatePackage(vendorId: string, packageId: string, input: UpdatePackageInput) {
  const existing = await vendorRepository.findPackageById(packageId);
  if (!existing || existing.vendorId !== vendorId) {
    throw new NotFoundError("Package not found");
  }
  await assertOwnReadyMediaOrNull(vendorId, input.imageMediaId, "imageMediaId");
  const pkg = await vendorRepository.updatePackage(packageId, input);
  await recalculateCompleteness(vendorId);
  return pkg;
}

export async function deletePackage(vendorId: string, packageId: string): Promise<void> {
  const existing = await vendorRepository.findPackageById(packageId);
  if (!existing || existing.vendorId !== vendorId) {
    throw new NotFoundError("Package not found");
  }
  await vendorRepository.deletePackage(packageId);
  await recalculateCompleteness(vendorId);
}

/**
 * A vendor that submitted before its owner verified their email sits in
 * PENDING_VERIFICATION indefinitely otherwise — there is no separate "verify
 * email" trigger inside the vendor module, since auth owns email verification
 * and vendors should not import auth (wrong direction of module coupling).
 * Instead this runs opportunistically whenever a vendor is fetched, so the
 * transition happens on the vendor's next read after they verify, with no
 * cross-module call needed.
 */
export async function advanceIfEmailNowVerified(vendorId: string): Promise<void> {
  const vendor = await vendorRepository.findVendorById(vendorId);
  if (!vendor || vendor.status !== "PENDING_VERIFICATION" || !vendor.ownerUserId) {
    return;
  }

  const owner = await prisma.user.findUnique({ where: { id: vendor.ownerUserId } });
  if (!owner?.emailVerifiedAt) {
    return;
  }

  await vendorRepository.changeStatusTx({
    vendorId,
    fromStatus: "PENDING_VERIFICATION",
    toStatus: "PENDING_APPROVAL",
    reason: "Owner email verified",
    changedByUserId: undefined,
  });
}

export async function submitForReview(vendorId: string, ownerUserId: string) {
  const vendor = await vendorRepository.findVendorById(vendorId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }

  if (vendor.status !== "DRAFT" && vendor.status !== "REJECTED") {
    throw new ConflictError(`Cannot submit a vendor with status ${vendor.status}`);
  }

  const { missing } = await recalculateCompleteness(vendorId);
  const missingRequired = missingRequiredForSubmission(missing);
  if (missingRequired.length > 0) {
    throw new ValidationError("Vendor profile is not ready for submission", {
      missing: missingRequired,
    });
  }

  const owner = await prisma.user.findUnique({ where: { id: ownerUserId } });
  const emailVerified = owner?.emailVerifiedAt != null;
  const nextStatus = emailVerified ? "PENDING_APPROVAL" : "PENDING_VERIFICATION";

  await vendorRepository.changeStatusTx({
    vendorId,
    toStatus: nextStatus,
    submittedAt: new Date(),
    fromStatus: vendor.status,
    reason: emailVerified ? "Submitted, email already verified" : "Submitted, awaiting email verification",
    changedByUserId: ownerUserId,
  });

  if (!emailVerified) {
    logger.info({ vendorId }, "Vendor submitted but owner email not verified yet — awaiting verification");
  }

  return vendorRepository.findVendorById(vendorId);
}
