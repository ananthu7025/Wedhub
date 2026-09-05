import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import type { VendorSearchFilters, VendorSearchRow } from "./search.types";

// Raw SQL is required here (not Prisma's query builder) for two things
// Prisma can't express: pg_trgm similarity() as an orderable/filterable
// score, and a dynamic number of category-attribute EXISTS joins built from
// user-supplied filters. Every value is passed through Prisma.sql's tagged
// template, which parameterizes them the same way Prisma's own query
// builder would — string concatenation into the SQL text never happens.
function buildWhere(filters: VendorSearchFilters): Prisma.Sql {
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
  const where = buildWhere(filters);
  const similarity = similarityExpr(filters.keyword);
  const categoryMatch = filters.categoryId ? Prisma.sql`true` : Prisma.sql`false`;
  const cityMatch = filters.cityId ? Prisma.sql`v.city_id = ${filters.cityId}::uuid` : Prisma.sql`false`;
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
          COALESCE(logo.optimized_object_key, logo.original_object_key) AS "logoObjectKey",
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
