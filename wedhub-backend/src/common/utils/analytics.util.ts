import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

// Best-effort, generic event log (Arch Phase 8's "analytics events" task).
// Never blocks or fails the caller's real response — the same pattern as
// Arch Phase 7's search_logs. Not a full analytics pipeline; that's Arch
// Phase 18's job.
export async function logAnalyticsEvent(input: {
  userId: string | undefined;
  eventType: string;
  vendorId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: input.userId ?? null,
        eventType: input.eventType,
        vendorId: input.vendorId ?? null,
        ...(input.metadata !== undefined
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  } catch {
    // analytics must never break the feature it's observing
  }
}
