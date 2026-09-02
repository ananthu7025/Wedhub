import { prisma } from "../../config/database";

export function countProfileViews(vendorId: string, since: Date) {
  return prisma.analyticsEvent.count({
    where: { vendorId, eventType: "vendor_profile_viewed", createdAt: { gte: since } },
  });
}

export function countLeads(vendorId: string, since: Date) {
  return prisma.lead.count({ where: { vendorId, createdAt: { gte: since } } });
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
