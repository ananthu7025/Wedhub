import { prisma } from "../../config/database";

export function findVendorsForComparison(vendorIds: string[]) {
  return prisma.vendor.findMany({
    where: { id: { in: vendorIds }, status: "APPROVED" },
    include: {
      profile: true,
      city: true,
      categories: { where: { isPrimary: true }, include: { category: true } },
      attributeValues: { include: { attribute: true } },
    },
  });
}

export function findComparableAttributes(categoryId: string) {
  return prisma.categoryAttribute.findMany({
    where: { categoryId, isComparable: true },
    orderBy: { sortOrder: "asc" },
  });
}
