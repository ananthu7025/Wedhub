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

// Words too short/common on their own to safely trigram-match a category or
// city (a bare "and"/"in"/"a" can spuriously score >0.3 similarity against
// some short name) — excluded from ever being tried as a standalone token.
const STOPWORDS = new Set(["a", "an", "the", "and", "in", "at", "for", "near", "me", "of"]);

interface KeywordParse {
  /** Best-matching category id(s) for the phrase this resolved from, or []. Multiple ids only when the phrase is genuinely ambiguous between categories (e.g. "wedding"). */
  categoryIds: string[];
  /** Best-matching city id, or undefined. A single city — unlike category, a query naming two cities has no sensible "match either" semantics for a hard filter. */
  cityId: string | undefined;
  /** Whatever words weren't consumed by the category/city match above, rejoined — still passed through as free text against business name/description/tags, same as the whole original keyword used to be. */
  remainingText: string | undefined;
}

// Splits a keyword like "kochi photographers" into an independently-resolved
// city ("kochi" -> Ernakulam) and category ("photographers" -> Photography &
// Videography) instead of trigram-matching the ENTIRE two-word string as one
// unit against each table (which is what this used to do, and why it never
// matched anything — "kochi photographers" isn't trigram-close to either
// "Ernakulam" or "Photography & Videography" on its own).
//
// Approach: try every contiguous run of words (longest first, so a two-word
// category/city name is preferred over a one-word fragment of it matching
// something else), resolve each run against both tables, and greedily keep
// the first city match and first category match found — REMOVING those
// words from further consideration so the same word can't double-count
// (e.g. "kochi" won't then also get tried as a leftover free-text word).
// This mirrors how a typeahead-driven search bar (type a location, get
// city-scoped results; type a service term, get category-scoped ones) reads
// a mixed free-text query without the user ever picking from two separate
// dropdowns.
async function parseKeyword(keyword: string | undefined): Promise<KeywordParse> {
  if (!keyword?.trim()) {
    return { categoryIds: [], cityId: undefined, remainingText: undefined };
  }

  const words = keyword
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) {
    return { categoryIds: [], cityId: undefined, remainingText: undefined };
  }

  // All contiguous runs (start, end exclusive), longest first, so e.g.
  // "wedding photographers" is tried as a whole phrase before "wedding" and
  // "photographers" are tried alone.
  const runs: Array<{ start: number; end: number; phrase: string }> = [];
  for (let len = words.length; len >= 1; len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const runWords = words.slice(start, start + len);
      if (len === 1 && STOPWORDS.has(runWords[0]!.toLowerCase())) continue;
      runs.push({ start, end: start + len, phrase: runWords.join(" ") });
    }
  }

  const consumed = new Array<boolean>(words.length).fill(false);
  let cityId: string | undefined;
  let cityRun: { start: number; end: number } | undefined;
  let categoryIds: string[] = [];
  let categoryRun: { start: number; end: number } | undefined;

  for (const run of runs) {
    if (run.start < consumed.length && consumed.slice(run.start, run.end).some(Boolean)) continue;

    if (!cityId) {
      // Fuzzy-matched against the alias KEYS too (not just an exact
      // dictionary lookup) — a typo of a colloquial name ("kochhi") is
      // common enough to handle the same way a typo of the real district
      // name already is. similarity('kochhi','kochi') = 0.625, well past
      // the 0.3 pg_trgm default threshold the % operator itself uses.
      // Uses Postgres's own similarity() (not a reimplementation of
      // trigram matching in JS) via unnest over the small, fixed alias
      // map — cheap, no index needed, same reasoning as the category/city
      // table scans above.
      const aliasKeys = Object.keys(CITY_KEYWORD_ALIASES);
      const aliasTargets = Object.values(CITY_KEYWORD_ALIASES);
      const aliasRows =
        aliasKeys.length > 0
          ? await prisma.$queryRaw<{ target: string }[]>(Prisma.sql`
              SELECT target FROM (
                SELECT unnest(${aliasTargets}::text[]) AS target, unnest(${aliasKeys}::text[]) AS alias
              ) aliases
              WHERE alias = ${run.phrase.toLowerCase()} OR similarity(alias, ${run.phrase.toLowerCase()}) >= 0.3
              ORDER BY (alias = ${run.phrase.toLowerCase()}) DESC, similarity(alias, ${run.phrase.toLowerCase()}) DESC
              LIMIT 1
            `)
          : [];
      const aliasTarget = aliasRows[0]?.target;

      const cityRows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM locations
        WHERE type = 'CITY' AND is_active = true
          AND (
            name % ${run.phrase} OR slug % ${run.phrase} OR name ILIKE '%' || ${run.phrase} || '%'
            ${aliasTarget ? Prisma.sql`OR slug = ${aliasTarget}` : Prisma.empty}
          )
        ORDER BY similarity(name, ${run.phrase}) DESC
        LIMIT 1
      `);
      if (cityRows.length > 0) {
        cityId = cityRows[0]!.id;
        cityRun = { start: run.start, end: run.end };
      }
    }

    if (categoryIds.length === 0) {
      const categoryRows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM categories
        WHERE is_active = true
          AND (name % ${run.phrase} OR slug % ${run.phrase} OR name ILIKE '%' || ${run.phrase} || '%')
      `);
      if (categoryRows.length > 0) {
        categoryIds = categoryRows.map((row) => row.id);
        categoryRun = { start: run.start, end: run.end };
      }
    }

    if (cityId && categoryIds.length > 0) break;
  }

  if (cityRun) {
    for (let i = cityRun.start; i < cityRun.end; i++) consumed[i] = true;
  }
  if (categoryRun) {
    for (let i = categoryRun.start; i < categoryRun.end; i++) consumed[i] = true;
  }

  const remainingWords = words.filter((_, i) => !consumed[i]);
  const remainingText = remainingWords.length > 0 ? remainingWords.join(" ") : undefined;

  return { categoryIds, cityId, remainingText };
}

// Raw SQL is required here (not Prisma's query builder) for two things
// Prisma can't express: pg_trgm similarity() as an orderable/filterable
// score, and a dynamic number of category-attribute EXISTS joins built from
// user-supplied filters. Every value is passed through Prisma.sql's tagged
// template, which parameterizes them the same way Prisma's own query
// builder would — string concatenation into the SQL text never happens.
function buildWhere(filters: VendorSearchFilters, parsed: KeywordParse, resolvedCityId: string | undefined): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`v.status = 'APPROVED'`, Prisma.sql`v.deleted_at IS NULL`];

  if (filters.categoryId) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM vendor_categories vc WHERE vc.vendor_id = v.id AND vc.category_id = ${filters.categoryId}::uuid)`,
    );
  }

  // A city named INSIDE the keyword (e.g. "kochi photographers" -> Ernakulam)
  // is a hard filter, same as the structured cityId query param — this is
  // the actual fix: previously a city name embedded in a longer keyword was
  // only ever a ranking nudge (or, before that, not resolved at all because
  // the whole multi-word string was trigram-matched as one unit against the
  // city table and never matched anything), so "kochi photographers" could
  // return photographers from anywhere in Kerala. An explicit ?cityId=...
  // query param always wins if both are somehow present.
  if (resolvedCityId) {
    conditions.push(Prisma.sql`v.city_id = ${resolvedCityId}::uuid`);
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

  if (filters.maxAvgResponseTimeMs !== undefined) {
    // NULL (no responded leads yet) never matches — same principle as
    // priceMin/priceMax already excluding vendors with no startingPrice
    // set: a vendor with no signal yet doesn't get to claim a fast one.
    conditions.push(Prisma.sql`v.avg_response_time_ms IS NOT NULL AND v.avg_response_time_ms <= ${filters.maxAvgResponseTimeMs}`);
  }

  // Free text only covers whatever WASN'T already consumed as a city/
  // category phrase above (parsed.remainingText) — e.g. for "kochi
  // photographers" this is undefined (both words were consumed), so no
  // free-text condition runs at all; the resolvedCityId hard filter above
  // plus the categoryMatch OR-branch below already narrow correctly. For
  // "kochi wedding decor specialists" ("wedding decor" -> Decorators,
  // "kochi" -> Ernakulam), remainingText would be "specialists", which
  // still gets a chance to match business name/bio/tags.
  const freeText = parsed.remainingText;
  if (freeText || parsed.categoryIds.length > 0) {
    conditions.push(
      Prisma.sql`(
        ${
          freeText
            ? Prisma.sql`
                v.business_name % ${freeText}
                OR vp.short_description % ${freeText}
                OR vp.description % ${freeText}
                OR ${freeText} ILIKE ANY (SELECT '%' || unnest(vp.tags) || '%')
              `
            : Prisma.sql`false`
        }
        ${
          parsed.categoryIds.length > 0
            ? Prisma.sql`OR EXISTS (
                SELECT 1 FROM vendor_categories vc
                WHERE vc.vendor_id = v.id AND vc.category_id = ANY(${parsed.categoryIds}::uuid[])
              )`
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
  // Item 4 — vendors with no responded leads yet (NULL) sort last, same
  // NULLS LAST convention as price_low/price_high above.
  fastest_reply: Prisma.sql`"avgResponseTimeMs" ASC NULLS LAST, "profileCompleteness" DESC`,
};

export async function searchVendors(
  filters: VendorSearchFilters,
  sort: string,
): Promise<{ rows: VendorSearchRow[]; total: number }> {
  const parsed = await parseKeyword(filters.keyword);
  // An explicit ?cityId=... query param always wins over whatever the
  // keyword parse found — a caller that already knows the city (e.g. the
  // frontend's own city dropdown) shouldn't have that overridden by
  // incidentally typing a different place name into the same search box.
  const resolvedCityId = filters.cityId ?? parsed.cityId;
  const where = buildWhere(filters, parsed, resolvedCityId);
  // Ranking still scores against the FULL original keyword (not just
  // remainingText) — even when every word got consumed as a city/category
  // phrase (so there's no free-text WHERE condition left to run), a
  // photographer named "Kochi Photo Studio" should still rank above one
  // named "Alappuzha Photo Studio" for a "kochi photographers" search, and
  // similarity() against the whole phrase is a harmless ranking signal even
  // when it's not precise enough to be a WHERE-clause filter on its own.
  const similarity = similarityExpr(filters.keyword);
  // A structured categoryId filter already restricts every row to that
  // category, so it's a blanket match; a keyword-resolved category isn't a
  // hard filter (vendors can still qualify via text/tag match instead), so
  // it needs a real per-row check for ranking to reward the vendors that
  // actually belong to the implied category.
  const categoryMatch = filters.categoryId
    ? Prisma.sql`true`
    : parsed.categoryIds.length > 0
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM vendor_categories vc
          WHERE vc.vendor_id = v.id AND vc.category_id = ANY(${parsed.categoryIds}::uuid[])
        )`
      : Prisma.sql`false`;
  const cityMatch = resolvedCityId ? Prisma.sql`v.city_id = ${resolvedCityId}::uuid` : Prisma.sql`false`;
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
          v.avg_response_time_ms AS "avgResponseTimeMs",
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
