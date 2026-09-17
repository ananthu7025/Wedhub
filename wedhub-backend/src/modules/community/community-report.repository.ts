import { prisma } from "../../config/database";

export function findExistingReport(postId: string, reporterId: string) {
  return prisma.communityPostReport.findUnique({ where: { postId_reporterId: { postId, reporterId } } });
}

export function createReport(postId: string, reporterId: string, reason: string) {
  return prisma.communityPostReport.create({ data: { postId, reporterId, reason } });
}
