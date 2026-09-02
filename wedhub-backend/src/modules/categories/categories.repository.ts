import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function findActiveCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      attributes: { orderBy: { sortOrder: "asc" } },
      services: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });
}

export function findAllCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { attributes: { orderBy: { sortOrder: "asc" } } },
  });
}

export function findCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      attributes: { orderBy: { sortOrder: "asc" } },
      children: true,
      // Vendor-facing "services offered" checkboxes (Frontend Arch Phase 5)
      // need a real catalog of this category's services — there is no
      // separate services module/endpoint, this was the smallest addition
      // that unblocks it without inventing new admin CRUD.
      services: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });
}

export function findCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export function findCategoryBySlugAnyCase(slug: string) {
  return prisma.category.findFirst({ where: { slug } });
}

export function createCategory(data: {
  name: string;
  slug: string;
  description: string | undefined;
  parentId: string | undefined;
}) {
  const fields = omitUndefined({ description: data.description, parentId: data.parentId });
  return prisma.category.create({
    data: { name: data.name, slug: data.slug, ...fields },
  });
}

export interface CategoryUpdateFields {
  name: string | undefined;
  description: string | undefined;
  sortOrder: number | undefined;
  isActive: boolean | undefined;
}

export function updateCategory(id: string, data: CategoryUpdateFields) {
  return prisma.category.update({ where: { id }, data: omitUndefined(data) });
}

export function createAttribute(
  categoryId: string,
  data: {
    key: string;
    label: string;
    dataType: string;
    options: string[] | undefined;
    isFilterable: boolean | undefined;
    isComparable: boolean | undefined;
  },
) {
  const fields = omitUndefined({
    options: data.options as Prisma.InputJsonValue | undefined,
    isFilterable: data.isFilterable,
    isComparable: data.isComparable,
  });
  return prisma.categoryAttribute.create({
    data: {
      categoryId,
      key: data.key,
      label: data.label,
      dataType: data.dataType as Prisma.CategoryAttributeCreateInput["dataType"],
      ...fields,
    },
  });
}

export function findAttributeById(id: string) {
  return prisma.categoryAttribute.findUnique({ where: { id } });
}

export interface AttributeUpdateFields {
  label: string | undefined;
  options: string[] | undefined;
  isFilterable: boolean | undefined;
  isComparable: boolean | undefined;
  sortOrder: number | undefined;
}

export function updateAttribute(id: string, data: AttributeUpdateFields) {
  const fields = omitUndefined({
    label: data.label,
    options: data.options as Prisma.InputJsonValue | undefined,
    isFilterable: data.isFilterable,
    isComparable: data.isComparable,
    sortOrder: data.sortOrder,
  });
  return prisma.categoryAttribute.update({ where: { id }, data: fields });
}

export function deleteAttribute(id: string) {
  return prisma.categoryAttribute.delete({ where: { id } });
}
