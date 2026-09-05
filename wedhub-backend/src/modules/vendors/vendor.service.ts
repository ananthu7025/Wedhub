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

async function assertOwnReadyMediaOrNull(vendorId: string, mediaId: string | null | undefined): Promise<void> {
  if (mediaId === null || mediaId === undefined) {
    return;
  }
  const media = await vendorRepository.findOwnMediaById(vendorId, mediaId);
  if (!media || media.status !== "READY") {
    throw new ValidationError("logoMediaId/coverMediaId must reference your own, fully-processed media");
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
      await prisma.$transaction([
        prisma.vendor.update({ where: { id: vendorId }, data: { status: "PENDING_APPROVAL" } }),
        prisma.vendorStatusHistory.create({
          data: {
            vendorId,
            fromStatus: "APPROVED",
            toStatus: "PENDING_APPROVAL",
            reason: "Primary category changed — re-review required",
          },
        }),
        prisma.auditLog.create({
          data: {
            action: "VENDOR_PRIMARY_CATEGORY_CHANGED",
            entityType: "vendor",
            entityId: vendorId,
            before: { status: "APPROVED" },
            after: { status: "PENDING_APPROVAL" },
          },
        }),
      ]);
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

export async function setAttributeValues(vendorId: string, values: AttributeValueInput[]) {
  const attributes = await vendorRepository.findAttributesByIds(values.map((v) => v.attributeId));
  const attributeById = new Map(attributes.map((attribute) => [attribute.id, attribute]));

  const rows = values.map((entry) => {
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
    };

    switch (attribute.dataType) {
      case "TEXT":
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
      case "NUMBER": {
        if (typeof entry.value !== "number") {
          throw new ValidationError(`Attribute "${attribute.label}" expects a numeric value`);
        }
        write.valueNumber = entry.value;
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

    return write;
  });

  await vendorRepository.replaceAttributeValues(vendorId, rows);
  await recalculateCompleteness(vendorId);
  return vendorRepository.findVendorById(vendorId);
}

export async function attachService(vendorId: string, serviceId: string, note: string | undefined) {
  const service = await vendorRepository.findServiceById(serviceId);
  if (!service) {
    throw new NotFoundError("Service not found");
  }
  const result = await vendorRepository.attachService(vendorId, serviceId, note);
  await recalculateCompleteness(vendorId);
  return result;
}

export async function detachService(vendorId: string, serviceId: string): Promise<void> {
  await vendorRepository.detachService(vendorId, serviceId);
  await recalculateCompleteness(vendorId);
}

export async function createPackage(vendorId: string, input: CreatePackageInput) {
  const pkg = await vendorRepository.createPackage(vendorId, input);
  await recalculateCompleteness(vendorId);
  return pkg;
}

export async function updatePackage(vendorId: string, packageId: string, input: UpdatePackageInput) {
  const existing = await vendorRepository.findPackageById(packageId);
  if (!existing || existing.vendorId !== vendorId) {
    throw new NotFoundError("Package not found");
  }
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

  await prisma.$transaction([
    prisma.vendor.update({ where: { id: vendorId }, data: { status: "PENDING_APPROVAL" } }),
    prisma.vendorStatusHistory.create({
      data: {
        vendorId,
        fromStatus: "PENDING_VERIFICATION",
        toStatus: "PENDING_APPROVAL",
        reason: "Owner email verified",
      },
    }),
  ]);
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

  await prisma.$transaction([
    prisma.vendor.update({
      where: { id: vendorId },
      data: { status: nextStatus, submittedAt: new Date() },
    }),
    prisma.vendorStatusHistory.create({
      data: {
        vendorId,
        fromStatus: vendor.status,
        toStatus: nextStatus,
        reason: emailVerified ? "Submitted, email already verified" : "Submitted, awaiting email verification",
        changedByUserId: ownerUserId,
      },
    }),
  ]);

  if (!emailVerified) {
    logger.info({ vendorId }, "Vendor submitted but owner email not verified yet — awaiting verification");
  }

  return vendorRepository.findVendorById(vendorId);
}
