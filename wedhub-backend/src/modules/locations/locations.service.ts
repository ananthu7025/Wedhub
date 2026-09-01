import { NotFoundError, ValidationError } from "../../common/errors";
import { slugify } from "../../common/utils/slug.util";
import * as locationsRepository from "./locations.repository";
import {
  LOCATION_HIERARCHY,
  type CreateLocationInput,
  type ListLocationsFilter,
  type UpdateLocationInput,
} from "./locations.types";

export function listLocations(filter: ListLocationsFilter) {
  return locationsRepository.findLocations(filter);
}

async function generateUniqueSlug(name: string, parentId: string | undefined): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;

  while (await locationsRepository.findLocationBySlugAndParent(candidate, parentId)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export async function createLocation(input: CreateLocationInput) {
  const expectedParentType = LOCATION_HIERARCHY[input.type];

  if (expectedParentType === null) {
    if (input.parentId) {
      throw new ValidationError(`${input.type} locations must not have a parent`);
    }
  } else {
    if (!input.parentId) {
      throw new ValidationError(`${input.type} locations require a parentId (expected a ${expectedParentType})`);
    }
    const parent = await locationsRepository.findLocationById(input.parentId);
    if (!parent) {
      throw new ValidationError("parentId does not reference an existing location");
    }
    if (parent.type !== expectedParentType) {
      throw new ValidationError(
        `${input.type} locations must have a parent of type ${expectedParentType}, but the referenced location is ${parent.type}`,
      );
    }
  }

  const slug = await generateUniqueSlug(input.name, input.parentId);

  return locationsRepository.createLocation({
    type: input.type,
    name: input.name,
    slug,
    parentId: input.parentId,
  });
}

export async function updateLocation(id: string, input: UpdateLocationInput) {
  const existing = await locationsRepository.findLocationById(id);
  if (!existing) {
    throw new NotFoundError("Location not found");
  }

  return locationsRepository.updateLocation(id, {
    name: input.name,
    isActive: input.isActive,
  });
}
