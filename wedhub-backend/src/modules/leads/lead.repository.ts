import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { toPageParams } from "../../common/utils/pagination.util";

const LEAD_DETAIL_INCLUDE = {
  enquiry: true,
  vendor: { select: { businessName: true } },
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
    ...toPageParams(filter.page, filter.limit),
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

export interface AdminLeadListFilter {
  status: LeadStatus | undefined;
  search: string | undefined;
  page: number;
  limit: number;
}

function buildAdminWhere(filter: Pick<AdminLeadListFilter, "status" | "search">): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.search) {
    where.OR = [
      { enquiry: { contactName: { contains: filter.search, mode: "insensitive" } } },
      { enquiry: { contactEmail: { contains: filter.search, mode: "insensitive" } } },
      { enquiry: { message: { contains: filter.search, mode: "insensitive" } } },
      { vendor: { businessName: { contains: filter.search, mode: "insensitive" } } },
    ];
  }
  return where;
}

export function findAllLeadsAdmin(filter: AdminLeadListFilter) {
  const where = buildAdminWhere(filter);
  return prisma.lead.findMany({
    where,
    include: { enquiry: true, vendor: { select: { id: true, businessName: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    ...toPageParams(filter.page, filter.limit),
  });
}

export function countAllLeadsAdmin(filter: Pick<AdminLeadListFilter, "status" | "search">) {
  return prisma.lead.count({ where: buildAdminWhere(filter) });
}

// Vendor lead dashboard analytics (product.md §23): received/contacted/
// response-rate/avg-response-time/qualified/won/lost/conversion-rate.
//
// `since` is optional and defaults to all-time — GET /leads/analytics (this
// function's original, still-live caller, leads.controller's getAnalytics)
// keeps its existing all-time contract unchanged. Arch Phase 18 Stage B
// added the parameter so getVendorAnalytics() (GET /vendors/me/analytics)
// can call this with its own tier-based window and merge the result into
// one unified response, without giving the standalone /leads/analytics
// endpoint a breaking behavior change or a new required param.
export async function getVendorLeadAnalytics(vendorId: string, since?: Date) {
  const createdAtFilter = since ? { createdAt: { gte: since } } : {};
  const [received, contacted, qualified, won, lost, respondedLeads] = await Promise.all([
    prisma.lead.count({ where: { vendorId, ...createdAtFilter } }),
    prisma.lead.count({ where: { vendorId, contactedAt: { not: null }, ...createdAtFilter } }),
    prisma.lead.count({ where: { vendorId, status: "QUALIFIED", ...createdAtFilter } }),
    prisma.lead.count({ where: { vendorId, status: "WON", ...createdAtFilter } }),
    prisma.lead.count({ where: { vendorId, status: "LOST", ...createdAtFilter } }),
    prisma.lead.findMany({
      where: { vendorId, respondedAt: { not: null }, ...createdAtFilter },
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
