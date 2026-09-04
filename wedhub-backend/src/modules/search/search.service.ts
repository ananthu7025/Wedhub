import { prisma } from "../../config/database";
import { getPublicUrl } from "../../integrations/storage/r2.client";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import * as searchRepository from "./search.repository";
import { rankVendors } from "./vendor-ranking.service";
import type { SearchVendorsQuery } from "./search.schema";
import type { VendorSearchRow } from "./search.types";

export interface SearchVendorsResult {
  vendors: ReturnType<typeof toPublicVendorSummary>[];
  total: number;
}

function toPublicVendorSummary(row: VendorSearchRow) {
  return {
    id: row.id,
    businessName: row.businessName,
    slug: row.slug,
    verificationLevel: row.verificationLevel,
    shortDescription: row.shortDescription,
    startingPrice: row.startingPrice,
    currency: row.currency,
    logoUrl: row.logoObjectKey ? getPublicUrl(row.logoObjectKey) : null,
  };
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
    page: query.page,
    limit: query.limit,
  };

  const { rows, total } = await searchRepository.searchVendors(filters, query.sort);
  const ranked = query.sort === "recommended" ? rankVendors(rows) : rows;

  await logSearch({ query, loggedInUserId, resultCount: total });

  return { vendors: ranked.map(toPublicVendorSummary), total };
}

async function logSearch(input: {
  query: SearchVendorsQuery;
  loggedInUserId: string | undefined;
  resultCount: number;
}): Promise<void> {
  const { query, loggedInUserId, resultCount } = input;
  try {
    await prisma.searchLog.create({
      data: {
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
      },
    });
  } catch {
    // Search analytics must never break a search response — logging failure
    // is swallowed (and would show up in Postgres/Prisma error logs anyway).
  }

  // Arch Phase 18 Stage A: a thin, duplicate event pointer into the unified
  // AnalyticsEvent stream alongside SearchLog's richer dedicated row above.
  // SearchLog remains the source of truth for search-specific reporting
  // (keyword/filters breakdown); this lets a later full-funnel query walk
  // one table (visitor -> search -> vendor view -> enquiry -> lead) instead
  // of UNIONing AnalyticsEvent with SearchLog on shape-incompatible columns.
  await logAnalyticsEvent({
    userId: loggedInUserId,
    eventType: "search_performed",
    metadata: { keyword: query.keyword ?? null, categoryId: query.categoryId ?? null, cityId: query.cityId ?? null, resultCount },
  });
}
