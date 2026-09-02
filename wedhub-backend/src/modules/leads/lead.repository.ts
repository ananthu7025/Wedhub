import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

const LEAD_DETAIL_INCLUDE = {
  enquiry: true,
  notes: { orderBy: { createdAt: "desc" as const }, include: { author: { select: { id: true, email: true } } } },
  statusHistory: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.LeadInclude;

export function findLeadById(id: string) {
  return prisma.lead.findUnique({ where: { id }, include: LEAD_DETAIL_INCLUDE });
}

export interface LeadListFilter {
  vendorId: string;
  status: LeadStatus | undefined;
  search: string | undefined;
  page: number;
  limit: number;
}

function buildWhere(filter: LeadListFilter): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { vendorId: filter.vendorId };
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.search) {
    where.enquiry = {
      OR: [
        { contactName: { contains: filter.search, mode: "insensitive" } },
        { contactEmail: { contains: filter.search, mode: "insensitive" } },
        { message: { contains: filter.search, mode: "insensitive" } },
      ],
    };
  }
  return where;
}

export function listVendorLeads(filter: LeadListFilter) {
  const where = buildWhere(filter);
  return prisma.lead.findMany({
    where,
    include: { enquiry: true },
    orderBy: { createdAt: "desc" },
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countVendorLeads(filter: LeadListFilter) {
  return prisma.lead.count({ where: buildWhere(filter) });
}

export function updateLeadStatus(
  id: string,
  status: LeadStatus,
  timestamps: { contactedAt?: Date; respondedAt?: Date },
) {
  return prisma.lead.update({
    where: { id },
    data: { status, isSpam: status === "SPAM", ...timestamps },
  });
}

export function createStatusHistory(input: {
  leadId: string;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  changedByUserId: string;
  reason: string | undefined;
}) {
  return prisma.leadStatusHistory.create({
    data: {
      leadId: input.leadId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      changedByUserId: input.changedByUserId,
      reason: input.reason ?? null,
    },
  });
}

export function createNote(leadId: string, authorId: string, body: string) {
  return prisma.leadNote.create({ data: { leadId, authorId, body } });
}

export function findAllLeadsAdmin(filter: { status: LeadStatus | undefined; page: number; limit: number }) {
  const where: Prisma.LeadWhereInput = filter.status ? { status: filter.status } : {};
  return prisma.lead.findMany({
    where,
    include: { enquiry: true, vendor: { select: { id: true, businessName: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countAllLeadsAdmin(filter: { status: LeadStatus | undefined }) {
  const where: Prisma.LeadWhereInput = filter.status ? { status: filter.status } : {};
  return prisma.lead.count({ where });
}

// Vendor lead dashboard analytics (product.md §23): received/contacted/
// response-rate/avg-response-time/qualified/won/lost/conversion-rate.
export async function getVendorLeadAnalytics(vendorId: string) {
  const [received, contacted, qualified, won, lost, respondedLeads] = await Promise.all([
    prisma.lead.count({ where: { vendorId } }),
    prisma.lead.count({ where: { vendorId, contactedAt: { not: null } } }),
    prisma.lead.count({ where: { vendorId, status: "QUALIFIED" } }),
    prisma.lead.count({ where: { vendorId, status: "WON" } }),
    prisma.lead.count({ where: { vendorId, status: "LOST" } }),
    prisma.lead.findMany({
      where: { vendorId, respondedAt: { not: null } },
      select: { createdAt: true, respondedAt: true },
    }),
  ]);

  const responseTimesMs = respondedLeads
    .map((l) => (l.respondedAt ? l.respondedAt.getTime() - l.createdAt.getTime() : null))
    .filter((ms): ms is number => ms !== null);

  const avgResponseTimeMs =
    responseTimesMs.length > 0 ? responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length : null;

  return {
    leadsReceived: received,
    leadsContacted: contacted,
    responseRate: received > 0 ? contacted / received : 0,
    averageResponseTimeMs: avgResponseTimeMs,
    qualifiedLeads: qualified,
    wonLeads: won,
    lostLeads: lost,
    conversionRate: received > 0 ? won / received : 0,
  };
}
