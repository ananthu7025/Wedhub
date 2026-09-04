import { prisma } from "../../config/database";

export function countProfileViews(vendorId: string, since: Date) {
  return prisma.analyticsEvent.count({
    where: { vendorId, eventType: "vendor_profile_viewed", createdAt: { gte: since } },
  });
}

// Arch Phase 18 Stage B: same shape as countProfileViews, over the
// vendor_impression events Stage A started emitting from VendorCard.tsx.
export function countImpressions(vendorId: string, since: Date) {
  return prisma.analyticsEvent.count({
    where: { vendorId, eventType: "vendor_impression", createdAt: { gte: since } },
  });
}

export function countLeads(vendorId: string, since: Date) {
  return prisma.lead.count({ where: { vendorId, createdAt: { gte: since } } });
}

// Arch Phase 18 Stage B: "Enquiries" (product.md §46's vendor-analytics
// list) is distinct from "Leads" — an enquiry can fan out to multiple leads
// under MULTI_VENDOR routing, so this counts distinct source enquiries that
// produced a lead for THIS vendor, not the raw Lead row count. Deliberately
// NOT derived from the enquiry_completed AnalyticsEvent (Stage A) — that
// event has no vendorId (it's enquiry-scoped, fired once per submission
// regardless of fan-out), so it can't be attributed to one vendor. Lead is
// the only vendor-scoped source of truth for this.
export async function countDistinctEnquiries(vendorId: string, since: Date): Promise<number> {
  const rows = await prisma.lead.findMany({
    where: { vendorId, createdAt: { gte: since } },
    select: { enquiryId: true },
    distinct: ["enquiryId"],
  });
  return rows.length;
}

export function countReviews(vendorId: string, since: Date) {
  return prisma.review.count({ where: { vendorId, createdAt: { gte: since }, status: "APPROVED" } });
}

// Advanced tier only: same raw events, grouped by calendar day so the
// vendor can see a trend rather than just a total.
export async function profileViewsByDay(vendorId: string, since: Date): Promise<Array<{ day: string; count: number }>> {
  const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS count
    FROM "analytics_events"
    WHERE "vendor_id" = ${vendorId}::uuid
      AND "event_type" = 'vendor_profile_viewed'
      AND "created_at" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;
  return rows.map((row) => ({ day: row.day.toISOString().slice(0, 10), count: Number(row.count) }));
}
