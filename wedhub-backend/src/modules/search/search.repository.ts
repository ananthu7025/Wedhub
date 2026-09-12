import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import type { VendorSearchFilters, VendorSearchRow } from "./search.types";

export function createSearchLog(data: {
  userId: string | null;
  keyword: string | null;
  categoryId: string | null;
  cityId: string | null;
  sort: string;
  resultCount: number;
  filters: Prisma.InputJsonValue;
}) {
  return prisma.searchLog.create({ data });
}

// A keyword that names a category (e.g. "photographer", "wedding venues")
// resolves against the small, fixed Category table so keyword search can
// find vendors by what they *are* (their category), not only by what their
// own bio text happens to say. Categories.length is in the tens, so a plain
// ILIKE/trigram scan needs no index — this mirrors the categoryId filter's
// own EXISTS against vendor_categories, just discovered from free text
// instead of a UUID. Returns every category id that plausibly matches,
// since an ambiguous keyword (e.g. "wedding") may fuzzy-match more than one.
async function resolveKeywordCategoryIds(keyword: string | undefined): Promise<string[]> {
  if (!keyword) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM categories
    WHERE is_active = true
      AND (name % ${keyword} OR slug % ${keyword} OR name ILIKE '%' || ${keyword} || '%')
  `);
  return rows.map((row) => row.id);
}

// Colloquial/alternate city names people actually type ("Trivandrum",
// "Cochin", "TVM") that don't match the canonical administrative-district
// name stored as Location.name ("Thiruvananthapuram", "Ernakulam") — the
// Location model has no alias column (a schema change, out of scope here),
// so this fixed map is the search-time equivalent of the frontend's
// lib/seo/location-aliases.ts for free-text keyword matching specifically.
const CITY_KEYWORD_ALIASES: Record<string, string> = {
  trivandrum: "thiruvananthapuram",
  tvm: "thiruvananthapuram",
  cochin: "ernakulam",
  kochi: "ernakulam",
  calicut: "kozhikode",
  trichur: "thrissur",
};

// A keyword that names a city (e.g. "photographers in Trivandrum") resolves
// against the Location table the same way resolveKeywordCategoryIds resolves
// categories — trigram/ILIKE match on the real name, plus a lookup against
// the known-alias map above for colloquial names that would never trigram-
// match their formal district name closely enough.
async function resolveKeywordCityIds(keyword: string | undefined): Promise<string[]> {
  if (!keyword) return [];
  const aliasTarget = CITY_KEYWORD_ALIASES[keyword.trim().toLowerCase()];
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM locations
    WHERE type = 'CITY' AND is_active = true
      AND (
        name % ${keyword} OR slug % ${keyword} OR name ILIKE '%' || ${keyword} || '%'
        ${aliasTarget ? Prisma.sql`OR slug = ${aliasTarget}` : Prisma.empty}
      )
  `);
  return rows.map((row) => row.id);
}

// Raw SQL is required here (not Prisma's query builder) for two things
// Prisma can't express: pg_trgm similarity() as an orderable/filterable
// score, and a dynamic number of category-attribute EXISTS joins built from
// user-supplied filters. Every value is passed through Prisma.sql's tagged
// template, which parameterizes them the same way Prisma's own query
// builder would — string concatenation into the SQL text never happens.
function buildWhere(filters: VendorSearchFilters, keywordCategoryIds: string[], keywordCityIds: string[]): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`v.status = 'APPROVED'`, Prisma.sql`v.deleted_at IS NULL`];

  if (filters.categoryId) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM vendor_categories vc WHERE vc.vendor_id = v.id AND vc.category_id = ${filters.categoryId}::uuid)`,
    );
  }

  if (filters.cityId) {
    conditions.push(Prisma.sql`v.city_id = ${filters.cityId}::uuid`);
  }

  if (filters.serviceAreaId) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM vendor_service_areas vsa WHERE vsa.vendor_id = v.id AND vsa.location_id = ${filters.serviceAreaId}::uuid)`,
    );
  }

  if (filters.priceMin !== undefined) {
    conditions.push(Prisma.sql`vp.starting_price >= ${filters.priceMin}`);
  }

  if (filters.priceMax !== undefined) {
    conditions.push(Prisma.sql`vp.starting_price <= ${filters.priceMax}`);
  }

  if (filters.verified) {
    conditions.push(Prisma.sql`v.verification_level != 'UNVERIFIED'`);
  }

  if (filters.keyword) {
    conditions.push(
      Prisma.sql`(
        v.business_name % ${filters.keyword}
        OR vp.short_description % ${filters.keyword}
        OR vp.description % ${filters.keyword}
        OR ${filters.keyword} ILIKE ANY (SELECT '%' || unnest(vp.tags) || '%')
        ${
          keywordCategoryIds.length > 0
            ? Prisma.sql`OR EXISTS (
                SELECT 1 FROM vendor_categories vc
                WHERE vc.vendor_id = v.id AND vc.category_id = ANY(${keywordCategoryIds}::uuid[])
              )`
            : Prisma.empty
        }
        ${
          keywordCityIds.length > 0
            ? Prisma.sql`OR v.city_id = ANY(${keywordCityIds}::uuid[])`
            : Prisma.empty
        }
      )`,
    );
  }

  if (filters.attributes) {
    for (const [attributeId, value] of Object.entries(filters.attributes)) {
      // vendor_attribute_values stores one typed value per row (value_text/
      // value_number/value_boolean/value_options — see Arch Phase 5's
      // typed-column design). A query-string filter value arrives as a
      // plain string with no declared type, so casting it to ::numeric or
      // ::boolean unconditionally would error out on a value like "Candid"
      // (Postgres evaluates every OR branch regardless of which one is
      // meant to match). Each cast is only attempted when the value is
      // actually well-formed for that type.
      const isNumeric = /^-?\d+(\.\d+)?$/.test(value);
      const isBoolean = value === "true" || value === "false";

      const valueConditions: Prisma.Sql[] = [Prisma.sql`vav.value_text = ${value}`, Prisma.sql`${value} = ANY(vav.value_options)`];
      if (isNumeric) {
        valueConditions.push(Prisma.sql`vav.value_number = ${value}::numeric`);
      }
      if (isBoolean) {
        valueConditions.push(Prisma.sql`vav.value_boolean = ${value}::boolean`);
      }

      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM vendor_attribute_values vav
          WHERE vav.vendor_id = v.id
            AND vav.attribute_id = ${attributeId}::uuid
            AND (${Prisma.join(valueConditions, " OR ")})
        )`,
      );
    }
  }

  return Prisma.join(conditions, " AND ");
}

function similarityExpr(keyword: string | undefined): Prisma.Sql {
  if (!keyword) {
    return Prisma.sql`0`;
  }
  return Prisma.sql`GREATEST(
    similarity(v.business_name, ${keyword}),
    similarity(coalesce(vp.short_description, ''), ${keyword}),
    similarity(coalesce(vp.description, ''), ${keyword})
  )`;
}

// References the outer query's own output-column aliases (the "ranked"
// subquery), not the inner v/vp table aliases — ORDER BY runs after the
// subquery's column list is already projected.
const SORT_CLAUSES: Record<string, Prisma.Sql> = {
  price_low: Prisma.sql`"startingPrice" ASC NULLS LAST, "profileCompleteness" DESC`,
  price_high: Prisma.sql`"startingPrice" DESC NULLS LAST, "profileCompleteness" DESC`,
  newest: Prisma.sql`"createdAt" DESC`,
  // "relevance" and "recommended" both order by similarity/completeness in
  // SQL for stable pagination; vendor-ranking.service.ts re-scores this same
  // page in-application for "recommended" without re-querying.
  relevance: Prisma.sql`similarity DESC, "profileCompleteness" DESC`,
  recommended: Prisma.sql`similarity DESC, "profileCompleteness" DESC`,
};

export async function searchVendors(
  filters: VendorSearchFilters,
  sort: string,
): Promise<{ rows: VendorSearchRow[]; total: number }> {
  const [keywordCategoryIds, keywordCityIds] = await Promise.all([
    resolveKeywordCategoryIds(filters.keyword),
    resolveKeywordCityIds(filters.keyword),
  ]);
  const where = buildWhere(filters, keywordCategoryIds, keywordCityIds);
  const similarity = similarityExpr(filters.keyword);
  // A structured categoryId filter already restricts every row to that
  // category, so it's a blanket match; a keyword-resolved category isn't a
  // hard filter (vendors can still qualify via text/tag match instead), so
  // it needs a real per-row check for ranking to reward the vendors that
  // actually belong to the implied category.
  const categoryMatch = filters.categoryId
    ? Prisma.sql`true`
    : keywordCategoryIds.length > 0
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM vendor_categories vc
          WHERE vc.vendor_id = v.id AND vc.category_id = ANY(${keywordCategoryIds}::uuid[])
        )`
      : Prisma.sql`false`;
  const cityMatch = filters.cityId
    ? Prisma.sql`v.city_id = ${filters.cityId}::uuid`
    : keywordCityIds.length > 0
      ? Prisma.sql`v.city_id = ANY(${keywordCityIds}::uuid[])`
      : Prisma.sql`false`;
  const offset = (filters.page - 1) * filters.limit;
  const orderBy = SORT_CLAUSES[sort] ?? SORT_CLAUSES.relevance;

  const [rows, totalResult] = await Promise.all([
    prisma.$queryRaw<VendorSearchRow[]>(Prisma.sql`
      SELECT * FROM (
        SELECT
          v.id,
          v.business_name AS "businessName",
          v.slug,
          v.status,
          v.verification_level AS "verificationLevel",
          v.profile_completeness AS "profileCompleteness",
          v.city_id AS "cityId",
          vp.short_description AS "shortDescription",
          vp.starting_price AS "startingPrice",
          vp.currency,
          -- Search/listing cards render this at <=320px (VendorCard/SearchCard
          -- are never wider than a ~33vw grid column) — the 300px thumbnail
          -- variant is already sufficient resolution, no need to ship the
          -- 800px "medium" variant into a small card. Falls back to medium
          -- then original only while a just-uploaded logo is still PROCESSING
          -- and hasn't produced a thumbnail yet.
          COALESCE(logo.thumbnail_object_key, logo.optimized_object_key, logo.original_object_key) AS "logoObjectKey",
          logo.blur_data_url AS "logoBlurDataUrl",
          v.created_at AS "createdAt",
          (${similarity})::float AS similarity,
          ${categoryMatch} AS "categoryMatch",
          ${cityMatch} AS "cityMatch"
        FROM vendors v
        LEFT JOIN vendor_profiles vp ON vp.vendor_id = v.id
        LEFT JOIN media logo ON logo.id = vp.logo_media_id AND logo.status = 'READY'
        WHERE ${where}
      ) ranked
      ORDER BY ${orderBy}
      LIMIT ${filters.limit}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM vendors v
      LEFT JOIN vendor_profiles vp ON vp.vendor_id = v.id
      WHERE ${where}
    `),
  ]);

  return { rows, total: Number(totalResult[0]?.count ?? 0) };
}
