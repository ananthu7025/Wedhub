import { getPublicUrl } from "../../integrations/storage/r2.client";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import { getEffectivePlan } from "../entitlements/entitlement.service";
import * as searchRepository from "./search.repository";
import { rankVendors } from "./vendor-ranking.service";
import type { SearchVendorsQuery } from "./search.schema";
import type { VendorSearchRow } from "./search.types";

export interface SearchVendorsResult {
  vendors: ReturnType<typeof toPublicVendorSummary>[];
  total: number;
}

function toPublicVendorSummary(row: VendorSearchRow & { isPremiumEligible?: boolean }) {
  return {
    id: row.id,
    businessName: row.businessName,
    slug: row.slug,
    verificationLevel: row.verificationLevel,
    shortDescription: row.shortDescription,
    startingPrice: row.startingPrice,
    currency: row.currency,
    logoUrl: row.logoObjectKey ? getPublicUrl(row.logoObjectKey) : null,
    logoBlurDataUrl: row.logoBlurDataUrl,
    avgResponseTimeMs: row.avgResponseTimeMs,
    isPremiumEligible: row.isPremiumEligible ?? false,
  };
}

// One batch query for this page's vendor IDs (not N+1) — see
// PLAN-2026-09-22-premium-feature-buildout.md §4b, option (a).
async function withPremiumEligibility(rows: VendorSearchRow[]): Promise<(VendorSearchRow & { isPremiumEligible: boolean })[]> {
  const plans = await Promise.all(rows.map(async (row) => [row.id, await getEffectivePlan(row.id)] as const));
  const eligibleByVendorId = new Map(plans.map(([id, plan]) => [id, plan.features.featured_eligibility]));
  return rows.map((row) => ({ ...row, isPremiumEligible: eligibleByVendorId.get(row.id) ?? false }));
}

export async function searchVendors(
  query: SearchVendorsQuery,
  loggedInUserId: string | undefined,
): Promise<SearchVendorsResult> {
  const filters = {
    keyword: query.keyword,
    categoryId: query.categoryId,
    cityId: query.cityId,
    serviceAreaId: query.serviceAreaId,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    verified: query.verified,
    attributes: query.attr,
    maxAvgResponseTimeMs: query.maxReplyHours !== undefined ? query.maxReplyHours * 60 * 60 * 1000 : undefined,
    page: query.page,
    limit: query.limit,
  };

  const { rows, total } = await searchRepository.searchVendors(filters, query.sort);
  // businessVisibility (vendor-ranking.service.ts §4 of the premium-feature
  // buildout plan) only matters for sort=recommended — a single batch query
  // for this page's vendor IDs, not N+1 per vendor.
  const ranked =
    query.sort === "recommended"
      ? rankVendors(await withPremiumEligibility(rows))
      : rows;

  void logSearch({ query, loggedInUserId, resultCount: total });

  return { vendors: ranked.map(toPublicVendorSummary), total };
}

async function logSearch(input: {
  query: SearchVendorsQuery;
  loggedInUserId: string | undefined;
  resultCount: number;
}): Promise<void> {
  const { query, loggedInUserId, resultCount } = input;

  const writeSearchLog = async () => {
    try {
      await searchRepository.createSearchLog({
        userId: loggedInUserId ?? null,
        keyword: query.keyword ?? null,
        categoryId: query.categoryId ?? null,
        cityId: query.cityId ?? null,
        sort: query.sort,
        resultCount,
        filters: {
          serviceAreaId: query.serviceAreaId ?? null,
          priceMin: query.priceMin ?? null,
          priceMax: query.priceMax ?? null,
          verified: query.verified ?? null,
          attr: query.attr ?? null,
        },
      });
    } catch {
      // Search analytics must never break a search response — logging failure
      // is swallowed (and would show up in Postgres/Prisma error logs anyway).
    }
  };

  // Arch Phase 18 Stage A: a thin, duplicate event pointer into the unified
  // AnalyticsEvent stream alongside SearchLog's richer dedicated row above.
  // SearchLog remains the source of truth for search-specific reporting
  // (keyword/filters breakdown); this lets a later full-funnel query walk
  // one table (visitor -> search -> vendor view -> enquiry -> lead) instead
  // of UNIONing AnalyticsEvent with SearchLog on shape-incompatible columns.
  await Promise.all([
    writeSearchLog(),
    logAnalyticsEvent({
      userId: loggedInUserId,
      eventType: "search_performed",
      metadata: { keyword: query.keyword ?? null, categoryId: query.categoryId ?? null, cityId: query.cityId ?? null, resultCount },
    }),
  ]);
}
