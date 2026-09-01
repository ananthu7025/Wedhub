import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { slugify } from "../../common/utils/slug.util";
import * as categoriesRepository from "./categories.repository";
import type {
  CreateAttributeInput,
  CreateCategoryInput,
  UpdateAttributeInput,
  UpdateCategoryInput,
} from "./categories.types";

export function listCategories() {
  return categoriesRepository.findActiveCategories();
}

export function listAllCategoriesForAdmin() {
  return categoriesRepository.findAllCategories();
}

export async function getCategoryBySlug(slug: string) {
  const category = await categoriesRepository.findCategoryBySlug(slug);
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return category;
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;

  while (await categoriesRepository.findCategoryBySlugAnyCase(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export async function createCategory(input: CreateCategoryInput) {
  if (input.parentId) {
    const parent = await categoriesRepository.findCategoryById(input.parentId);
    if (!parent) {
      throw new ValidationError("parentId does not reference an existing category");
    }
  }

  const slug = await generateUniqueSlug(input.name);

  return categoriesRepository.createCategory({
    name: input.name,
    slug,
    description: input.description,
    parentId: input.parentId,
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

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}
