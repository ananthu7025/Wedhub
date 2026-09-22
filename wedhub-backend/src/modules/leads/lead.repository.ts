import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { toPageParams } from "../../common/utils/pagination.util";

const LEAD_DETAIL_INCLUDE = {
  enquiry: true,
  vendor: { select: { businessName: true } },
  notes: { orderBy: { createdAt: "desc" as const }, include: { author: { select: { id: true, email: true } } } },
  statusHistory: { orderBy: { createdAt: "desc" as const } },
  // Item 5: lets the vendor's lead detail view link straight into the
  // matching inbox thread, if the enquiry that created this lead also
  // opened one (see enquiry.service.ts::startConversationsForEnquiry). At
  // most one row in practice — see the identical comment on
  // enquiry.repository.ts's MY_ENQUIRY_INCLUDE.
  conversations: { select: { id: true }, take: 1 },
} satisfies Prisma.LeadInclude;

export function findLeadById(id: string) {
  return prisma.lead.findUnique({ where: { id }, include: LEAD_DETAIL_INCLUDE });
}

// Used by enquiry.service.ts to enforce monthly_lead_limit before routing a
// new enquiry to a vendor — counts every lead regardless of status/isSpam,
// matching "leads received" rather than "leads worth pursuing" (a vendor's
// cap is about inbound volume, not lead quality).
export function countLeadsSince(vendorId: string, since: Date): Promise<number> {
  return prisma.lead.count({ where: { vendorId, createdAt: { gte: since } } });
}

// Used by the same cap check to batch-resolve multiple candidate vendors in
// one query (multi-vendor enquiry fan-out) rather than one count() per
// vendor.
export async function countLeadsSinceForVendors(vendorIds: string[], since: Date): Promise<Map<string, number>> {
  if (vendorIds.length === 0) return new Map();
  const rows = await prisma.lead.groupBy({
    by: ["vendorId"],
    where: { vendorId: { in: vendorIds }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const counts = new Map(rows.map((r) => [r.vendorId, r._count._all]));
  for (const vendorId of vendorIds) {
    if (!counts.has(vendorId)) counts.set(vendorId, 0);
  }
  return counts;
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

// Item 17: a lower-priority, separate signal from real enquiry-based
// Leads — deliberately never creates a Lead row (confirmed with the user:
// silently turning every profile view into an equal CRM lead would dilute
// and misrepresent real enquiry intent, and anonymous visits have no
// contact info to build a Lead from anyway). Reads straight off the
// existing vendor_profile_viewed AnalyticsEvent (vendor.controller.ts's
// getPublicVendor), scoped to logged-in visitors only (userId is nullable
// on AnalyticsEvent for anonymous visits).
//
// Contact-reveal gating addition: the public profile no longer shows
// phone/email/website directly — a "Reveal contact details" button fires
// a separate `contact_details_revealed` event on click (VendorContactLinks),
// which is a stronger intent signal than a plain view. Both event types are
// merged into one per-viewer timeline here rather than two separate lists:
// each viewer gets `kind: "REVEALED_CONTACT"` if they ever revealed contact
// info for this vendor, else `kind: "VIEWED"`, and `createdAt` is their most
// recent activity of either kind. `distinct: ["userId"]` ordered by
// createdAt desc gives one row per viewer per event type, which the merge
// step below then collapses to one row per viewer.
export async function listProfileViewers(vendorId: string, page: number, limit: number) {
  const baseWhere = { vendorId, userId: { not: null } } as const;
  const [viewRows, revealRows] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { ...baseWhere, eventType: "vendor_profile_viewed" },
      distinct: ["userId"],
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        createdAt: true,
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.analyticsEvent.findMany({
      where: { ...baseWhere, eventType: "contact_details_revealed" },
      distinct: ["userId"],
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        createdAt: true,
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  const merged = new Map<
    string,
    { userId: string; createdAt: Date; kind: "VIEWED" | "REVEALED_CONTACT"; user: (typeof viewRows)[number]["user"] }
  >();

  for (const row of viewRows) {
    if (!row.userId) continue;
    merged.set(row.userId, { userId: row.userId, createdAt: row.createdAt, kind: "VIEWED", user: row.user });
  }
  for (const row of revealRows) {
    if (!row.userId) continue;
    const existing = merged.get(row.userId);
    merged.set(row.userId, {
      userId: row.userId,
      createdAt: existing && existing.createdAt > row.createdAt ? existing.createdAt : row.createdAt,
      kind: "REVEALED_CONTACT",
      user: row.user,
    });
  }

  const all = Array.from(merged.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const total = all.length;
  const rows = all.slice((page - 1) * limit, (page - 1) * limit + limit);
  return { rows, total };
}

// Item 4: denormalizes an all-time average reply time onto Vendor itself,
// mirroring review.repository.ts's averageRating/reviewCount pattern —
// recomputed on the event that changes it (a lead marked RESPONDED, see
// lead.service.ts::updateStatus) rather than a scheduled job or a live
// aggregate at search/read time, which getVendorLeadAnalytics above is too
// expensive for (unbounded per-vendor findMany, no index on respondedAt).
// Deliberately all-time, not windowed — Vendor.avgResponseTimeMs is a
// single denormalized column, not a per-window metric like the tiered
// analytics endpoint's `since` param.
export async function recalculateAvgResponseTime(vendorId: string): Promise<void> {
  const respondedLeads = await prisma.lead.findMany({
    where: { vendorId, respondedAt: { not: null } },
    select: { createdAt: true, respondedAt: true },
  });
  const responseTimesMs = respondedLeads
    .map((l) => (l.respondedAt ? l.respondedAt.getTime() - l.createdAt.getTime() : null))
    .filter((ms): ms is number => ms !== null);
  const avgResponseTimeMs =
    responseTimesMs.length > 0 ? Math.round(responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length) : null;

  await prisma.vendor.update({ where: { id: vendorId }, data: { avgResponseTimeMs } });
}

// Pay-per-lead contact unlock (Free-tier vendor). Same shape as
// wedding-website.repository.ts's createPendingPayment — a one-off Payment
// with no Subscription involved, purpose-discriminated. See
// PLAN-2026-09-22-premium-feature-buildout.md §6d.
export function createPendingUnlockPayment(data: {
  leadId: string;
  vendorId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}) {
  return prisma.payment.create({
    data: {
      purpose: "LEAD_UNLOCK",
      unlockedLeadId: data.leadId,
      pendingVendorId: data.vendorId,
      razorpayOrderId: data.razorpayOrderId,
      amount: data.amount,
      currency: data.currency,
    },
  });
}

export function markLeadContactUnlocked(leadId: string) {
  return prisma.lead.update({ where: { id: leadId }, data: { contactUnlockedAt: new Date() } });
}
