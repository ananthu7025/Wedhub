import { prisma } from "../../config/database";

export function listTags() {
  return prisma.communityTag.findMany({ orderBy: { sortOrder: "asc" } });
}

export function findTagById(id: string) {
  return prisma.communityTag.findUnique({ where: { id } });
}
