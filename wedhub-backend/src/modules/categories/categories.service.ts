import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import * as categoriesRepository from "./categories.repository";
import type {
  CreateAttributeInput,
  CreateCategoryInput,
  CreateServiceInput,
  UpdateAttributeInput,
  UpdateCategoryInput,
  UpdateServiceInput,
} from "./categories.types";

export function listCategories() {
  return categoriesRepository.findActiveCategories();
}

export function listAllCategoriesForAdmin() {
  return categoriesRepository.findAllCategories();
}

// Backs the public homepage's category carousel/bento grid — real,
// admin-curated categories instead of a hardcoded frontend array.
export function listFeaturedCategories() {
  return categoriesRepository.findFeaturedCategories();
}

export async function getCategoryBySlug(slug: string) {
  const category = await categoriesRepository.findCategoryBySlug(slug);
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  if (input.parentId) {
    const parent = await categoriesRepository.findCategoryById(input.parentId);
    if (!parent) {
      throw new ValidationError("parentId does not reference an existing category");
    }
  }

  const slug = await generateUniqueSlug(slugify(input.name), async (candidate) =>
    Boolean(await categoriesRepository.findCategoryBySlugAnyCase(candidate)),
  );

  return categoriesRepository.createCategory({
    name: input.name,
    slug,
    description: input.description,
    parentId: input.parentId,
    hasStoreEnabled: input.hasStoreEnabled,
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const existing = await categoriesRepository.findCategoryById(id);
  if (!existing) {
    throw new NotFoundError("Category not found");
  }

  return categoriesRepository.updateCategory(id, {
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    hasStoreEnabled: input.hasStoreEnabled,
    imageUrl: input.imageUrl,
    isFeaturedOnHomepage: input.isFeaturedOnHomepage,
    homepageSortOrder: input.homepageSortOrder,
    startingPriceLabel: input.startingPriceLabel,
  });
}

export async function createAttribute(categoryId: string, input: CreateAttributeInput) {
  const category = await categoriesRepository.findCategoryById(categoryId);
  if (!category) {
    throw new NotFoundError("Category not found");
  }

  try {
    return await categoriesRepository.createAttribute(categoryId, input);
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new ConflictError(`An attribute with key "${input.key}" already exists on this category`);
    }
    throw err;
  }
}

export async function updateAttribute(attributeId: string, input: UpdateAttributeInput) {
  const existing = await categoriesRepository.findAttributeById(attributeId);
  if (!existing) {
    throw new NotFoundError("Attribute not found");
  }

  return categoriesRepository.updateAttribute(attributeId, {
    label: input.label,
    options: input.options,
    isFilterable: input.isFilterable,
    isComparable: input.isComparable,
    sortOrder: input.sortOrder,
  });
}

export async function deleteAttribute(attributeId: string): Promise<void> {
  const existing = await categoriesRepository.findAttributeById(attributeId);
  if (!existing) {
    throw new NotFoundError("Attribute not found");
  }
  await categoriesRepository.deleteAttribute(attributeId);
}

export async function createService(categoryId: string, input: CreateServiceInput) {
  const category = await categoriesRepository.findCategoryById(categoryId);
  if (!category) {
    throw new NotFoundError("Category not found");
  }

  const slug = await generateUniqueSlug(slugify(input.name), async (candidate) =>
    Boolean(await categoriesRepository.findServiceBySlug(categoryId, candidate)),
  );

  return categoriesRepository.createService(categoryId, {
    name: input.name,
    slug,
    description: input.description,
  });
}

export async function updateService(serviceId: string, input: UpdateServiceInput) {
  const existing = await categoriesRepository.findServiceById(serviceId);
  if (!existing) {
    throw new NotFoundError("Service not found");
  }

  return categoriesRepository.updateService(serviceId, {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  });
}

export async function deleteService(serviceId: string): Promise<void> {
  const existing = await categoriesRepository.findServiceById(serviceId);
  if (!existing) {
    throw new NotFoundError("Service not found");
  }
  await categoriesRepository.deleteService(serviceId);
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}
