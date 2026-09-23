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
  alleppey: "alappuzha",
  calicut: "kozhikode",
  trichur: "thrissur",
};

// Explicit category synonyms, keyed by the REAL Category.slug (stable
// across reseeds, unlike an id) — checked BEFORE any trigram/similarity
// matching against the category's literal name. This is the fix for cases
// like "bridal makeup kochi" (previously: "bridal makeup" isn't
// trigram-close to "Makeup Artists" as a literal string, so it fell through
// to free-text matching, which then matched a BRIDAL WEAR vendor whose
// description happened to contain the word "bridal" — exactly the wrong
// vendor for a makeup search) and "MUA"/"hall"/"auditorium"/"henna", none
// of which are trigram-similar to their real category name at all.
// Each entry is checked against the SINGULARIZED phrase (see singularize()
// below), so "photographer"/"photographers", "caterer"/"caterers" etc. all
// resolve identically without listing every plural form here.
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "photography-videography": ["photographer", "photography", "wedding photography", "videographer", "videography", "photo", "cinematography"],
  "makeup-artists": ["makeup", "makeup artist", "bridal makeup", "mua", "beautician", "hair and makeup"],
  venues: ["venue", "hall", "auditorium", "resort", "banquet hall", "wedding hall", "marriage hall", "convention center", "function hall"],
  caterers: ["catering", "caterer", "wedding food", "food service", "sadya"],
  "mehendi-artists": ["mehndi", "mehendi", "henna", "mehndi artist", "henna artist"],
  decorators: ["decorator", "decoration", "wedding decor", "decor", "mandap decoration", "stage decoration"],
  "bridal-wear": ["bridal wear", "bridal outfit", "wedding saree", "lehenga", "wedding gown", "bride outfit"],
  "groom-wear": ["groom wear", "groom outfit", "sherwani", "groom suit"],
  jewellery: ["jewelry", "jewellery", "bridal jewellery", "ornaments", "gold jewellery"],
  "artists-djs": ["dj", "band", "live band", "wedding dj", "music", "orchestra", "emcee", "anchor"],
  "cocktail-bar-services": ["bartender", "bar service", "cocktail", "mocktail", "mixologist"],
  "cakes-desserts": ["cake", "wedding cake", "dessert", "baker", "bakery"],
  "event-planners": ["event planner", "wedding planner", "event management", "wedding organiser", "wedding organizer", "planner"],
  "wedding-cars-luxury-rentals": ["wedding car", "luxury car", "car rental", "vintage car", "bridal car"],
};

// Words too short/common on their own to safely trigram-match a category or
// city (a bare "and"/"in"/"a" can spuriously score >0.3 similarity against
// some short name) — excluded from ever being tried as a standalone token.
const STOPWORDS = new Set(["a", "an", "the", "and", "in", "at", "for", "near", "me", "of"]);

// Minimal English singularization — enough for this domain's vocabulary
// ("photographers" -> "photographer", "caterers" -> "caterer", "venues" ->
// "venue"), not a general-purpose stemmer. Applied to every candidate
// phrase before synonym lookup so CATEGORY_SYNONYMS only needs to list each
// term once instead of every singular/plural pair.
function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y"; // "hobbies" -> "hobby" (unused here but a normal English rule)
  if (word.endsWith("sses")) return word.slice(0, -2); // "dresses" -> "dress"
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .split(/\s+/)
    .map(singularize)
    .join(" ");
}

interface KeywordParse {
  /** Best-matching category id, or undefined. Unlike the old implementation, this is now a SINGLE id whenever a category term was confidently recognized (synonym hit, or a high-confidence name/slug match) — see resolveCategoryRun's confident flag. */
  categoryId: string | undefined;
  /** True when categoryId came from an explicit synonym hit or a near-exact name match, meaning the caller should treat it as a HARD filter rather than a ranking nudge — this is the core fix for "bridal makeup kochi" returning a bridal-wear vendor: a confidently-recognized category term must never be overridden by a free-text/description match on an unrelated vendor. */
  categoryConfident: boolean;
  /** Best-matching city id, or undefined. A single city — unlike category, a query naming two cities has no sensible "match either" semantics for a hard filter. */
  cityId: string | undefined;
  /** Whatever words weren't consumed by the category/city match above, rejoined — still passed through as free text against business name/description/tags, same as the whole original keyword used to be. */
  remainingText: string | undefined;
}

interface CategoryLookup {
  id: string;
  slug: string;
  name: string;
}

async function resolveCategoryRun(
  phrase: string,
  categories: CategoryLookup[],
): Promise<{ id: string; confident: boolean } | undefined> {
  const normalized = normalizePhrase(phrase);

  // 1. Exact synonym hit — the strongest, most confident signal. Checked
  // against every category's synonym list, singularized on both sides so
  // "photographers" matches the "photographer" dictionary entry.
  for (const category of categories) {
    const synonyms = CATEGORY_SYNONYMS[category.slug] ?? [];
    if (synonyms.some((syn) => normalizePhrase(syn) === normalized)) {
      return { id: category.id, confident: true };
    }
  }

  // 2. Near-exact match against the category's real name/slug (e.g. typing
  // "venues" or "venue" directly, or a close typo of the literal name) —
  // still confident enough to be a hard filter. Postgres trigram similarity
  // of 1.0 on the whole normalized string, or a very close (>=0.6) match,
  // both count as "the user clearly named this category."
  const nameRows = await prisma.$queryRaw<{ id: string; sim: number }[]>(Prisma.sql`
    SELECT id, similarity(name, ${normalized}) AS sim FROM categories
    WHERE is_active = true AND (name % ${normalized} OR slug % ${normalized} OR name ILIKE '%' || ${normalized} || '%')
    ORDER BY sim DESC
    LIMIT 1
  `);
  if (nameRows.length > 0) {
    const row = nameRows[0]!;
    return { id: row.id, confident: row.sim >= 0.6 };
  }

  // 3. Loose synonym similarity — a typo of a synonym ("photograhper" ->
  // "photographer") caught by trigram similarity against the synonym list
  // itself rather than the category's real name, which a synonym is often
  // nowhere close to (e.g. "mua" vs. "Makeup Artists" has ~0 similarity as
  // literal strings). Still confident (it named a real synonym, just
  // misspelled) — this is what keeps typo tolerance working for synonyms,
  // not just for real category names. One batched query via unnest (not a
  // per-synonym round trip) over every (categoryId, normalizedSynonym) pair
  // across every category — cheap: the whole dictionary is well under 100
  // rows, computed once per parseKeyword() call, not per category.
  const synonymCategoryIds: string[] = [];
  const synonymTexts: string[] = [];
  for (const category of categories) {
    for (const syn of CATEGORY_SYNONYMS[category.slug] ?? []) {
      synonymCategoryIds.push(category.id);
      synonymTexts.push(normalizePhrase(syn));
    }
  }
  if (synonymCategoryIds.length > 0) {
    const bestRows = await prisma.$queryRaw<{ id: string; sim: number }[]>(Prisma.sql`
      SELECT category_id AS id, similarity(synonym, ${normalized}) AS sim FROM (
        SELECT unnest(${synonymCategoryIds}::uuid[]) AS category_id, unnest(${synonymTexts}::text[]) AS synonym
      ) pairs
      ORDER BY sim DESC
      LIMIT 1
    `);
    const best = bestRows[0];
    if (best && best.sim >= 0.4) {
      return { id: best.id, confident: true };
    }
  }

  return undefined;
}

async function resolveCityRun(phrase: string): Promise<string | undefined> {
  const normalized = phrase.toLowerCase();

  // Fuzzy-matched against the alias KEYS too (not just an exact dictionary
  // lookup) — a typo of a colloquial name ("kochhi") is common enough to
  // handle the same way a typo of the real district name already is.
  // similarity('kochhi','kochi') = 0.625, well past the 0.3 pg_trgm default
  // threshold the % operator itself uses. Uses Postgres's own similarity()
  // (not a reimplementation of trigram matching in JS) via unnest over the
  // small, fixed alias map — cheap, no index needed.
  const aliasKeys = Object.keys(CITY_KEYWORD_ALIASES);
  const aliasTargets = Object.values(CITY_KEYWORD_ALIASES);
  const aliasRows =
    aliasKeys.length > 0
      ? await prisma.$queryRaw<{ target: string }[]>(Prisma.sql`
          SELECT target FROM (
            SELECT unnest(${aliasTargets}::text[]) AS target, unnest(${aliasKeys}::text[]) AS alias
          ) aliases
          WHERE alias = ${normalized} OR similarity(alias, ${normalized}) >= 0.3
          ORDER BY (alias = ${normalized}) DESC, similarity(alias, ${normalized}) DESC
          LIMIT 1
        `)
      : [];
  const aliasTarget = aliasRows[0]?.target;

  const cityRows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM locations
    WHERE type = 'CITY' AND is_active = true
      AND (
        name % ${normalized} OR slug % ${normalized} OR name ILIKE '%' || ${normalized} || '%'
        ${aliasTarget ? Prisma.sql`OR slug = ${aliasTarget}` : Prisma.empty}
      )
    ORDER BY similarity(name, ${normalized}) DESC
    LIMIT 1
  `);
  return cityRows[0]?.id;
}

// Splits a keyword like "kochi photographers" into an independently-resolved
// city ("kochi" -> Ernakulam) and category ("photographers" -> Photography &
// Videography) instead of trigram-matching the ENTIRE two-word string as one
// unit against each table. Also resolves category synonyms ("bridal
// makeup" -> Makeup Artists, "mua" -> Makeup Artists, "hall" -> Venues)
// that have no trigram similarity to the category's literal name at all.
//
// Approach: try every contiguous run of words (longest first, so a two-word
// category/city name/synonym is preferred over a one-word fragment of it
// matching something else), resolve each run against both tables, and
// greedily keep the first city match and first category match found —
// REMOVING those words from further consideration so the same word can't
// double-count.
async function parseKeyword(keyword: string | undefined): Promise<KeywordParse> {
  if (!keyword?.trim()) {
    return { categoryId: undefined, categoryConfident: false, cityId: undefined, remainingText: undefined };
  }

  const words = keyword
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) {
    return { categoryId: undefined, categoryConfident: false, cityId: undefined, remainingText: undefined };
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
  });

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
  let categoryId: string | undefined;
  let categoryConfident = false;
  let categoryRun: { start: number; end: number } | undefined;

  for (const run of runs) {
    if (run.start < consumed.length && consumed.slice(run.start, run.end).some(Boolean)) continue;

    if (!cityId) {
      const resolved = await resolveCityRun(run.phrase);
      if (resolved) {
        cityId = resolved;
        cityRun = { start: run.start, end: run.end };
      }
    }

    if (!categoryId) {
      const resolved = await resolveCategoryRun(run.phrase, categories);
      if (resolved) {
        categoryId = resolved.id;
        categoryConfident = resolved.confident;
        categoryRun = { start: run.start, end: run.end };
      }
    }

    if (cityId && categoryId) break;
  }

  if (cityRun) {
    for (let i = cityRun.start; i < cityRun.end; i++) consumed[i] = true;
  }
  if (categoryRun) {
    for (let i = categoryRun.start; i < categoryRun.end; i++) consumed[i] = true;
  }

  const remainingWords = words.filter((_, i) => !consumed[i]);
  const remainingText = remainingWords.length > 0 ? remainingWords.join(" ") : undefined;

  return { categoryId, categoryConfident, cityId, remainingText };
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
  } else if (parsed.categoryId && parsed.categoryConfident) {
    // THE core fix: a confidently-recognized category term (synonym hit or
    // a near-exact name match — see resolveCategoryRun) is now a HARD
    // filter, exactly like an explicit ?categoryId=... param. Previously
    // this was only ever an OR-branch alongside free-text matching, which
    // is exactly how "bridal makeup kochi" could return a BRIDAL WEAR
    // vendor: "bridal makeup" found no category, fell back to matching the
    // words "bridal"/"makeup" against description text, and a bridal-wear
    // vendor's description containing "bridal" was enough to qualify. A
    // vendor whose CATEGORY doesn't match a confidently-named category must
    // never appear just because its bio text happens to share a word.
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM vendor_categories vc WHERE vc.vendor_id = v.id AND vc.category_id = ${parsed.categoryId}::uuid)`,
    );
  }

  // A city named INSIDE the keyword (e.g. "kochi photographers" -> Ernakulam)
  // is a hard filter, same as the structured cityId query param. An explicit
  // ?cityId=... query param always wins if both are somehow present.
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

  // Item 11: matches if ANY of the vendor's active catalog items falls in
  // range — via a variant's own price when the item has variants, or the
  // item's basePrice when it doesn't (an item with variants has no
  // meaningful basePrice of its own, so it's deliberately excluded from the
  // basePrice branch once any variant row exists, to avoid double-counting
  // the same item under two different prices).
  if (filters.catalogPriceMin !== undefined || filters.catalogPriceMax !== undefined) {
    const min = filters.catalogPriceMin;
    const max = filters.catalogPriceMax;
    const variantRange = Prisma.sql`(
      ${min !== undefined ? Prisma.sql`civ.price >= ${min}` : Prisma.sql`true`}
      AND ${max !== undefined ? Prisma.sql`civ.price <= ${max}` : Prisma.sql`true`}
    )`;
    const baseRange = Prisma.sql`(
      ${min !== undefined ? Prisma.sql`ci.base_price >= ${min}` : Prisma.sql`true`}
      AND ${max !== undefined ? Prisma.sql`ci.base_price <= ${max}` : Prisma.sql`true`}
    )`;
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM catalog_items ci
        WHERE ci.vendor_id = v.id AND ci.is_active = true
          AND (
            EXISTS (SELECT 1 FROM catalog_item_variants civ WHERE civ.item_id = ci.id AND ${variantRange})
            OR (ci.base_price IS NOT NULL AND NOT EXISTS (SELECT 1 FROM catalog_item_variants civ2 WHERE civ2.item_id = ci.id) AND ${baseRange})
          )
      )`,
    );
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
  // category phrase above (parsed.remainingText). When a category was
  // recognized but NOT confidently (a loose/ambiguous match), it still
  // contributes as an OR-branch here rather than a hard filter above — that
  // keeps the old, more permissive behavior for genuinely ambiguous terms
  // (e.g. "wedding" alone, which isn't a category synonym for anything
  // specific) while the confident case above is now a real filter.
  const freeText = parsed.remainingText;
  const looseCategoryId = !parsed.categoryConfident ? parsed.categoryId : undefined;
  if (freeText || looseCategoryId) {
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
          looseCategoryId
            ? Prisma.sql`OR EXISTS (
                SELECT 1 FROM vendor_categories vc
                WHERE vc.vendor_id = v.id AND vc.category_id = ${looseCategoryId}::uuid
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

// Weighted relevance: an exact category match is worth more than any
// description/tag keyword similarity — this is the SQL-level expression of
// "do not allow general description matches to outrank correct category
// matches." categoryMatch/cityMatch below are already booleans computed
// per-row; this folds them into a single sortable score alongside the
// existing free-text similarity, weighted so category correctness always
// dominates over a merely-similar bio.
function relevanceExpr(keyword: string | undefined): Prisma.Sql {
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
// subquery's column list is already projected. "relevance"/"recommended"
// now sort by categoryMatch FIRST (a vendor that genuinely belongs to a
// confidently-named category always outranks one that merely has similar
// bio text), then cityMatch, then the free-text similarity score as a
// tie-breaker among vendors already in the right category/city.
const SORT_CLAUSES: Record<string, Prisma.Sql> = {
  price_low: Prisma.sql`"startingPrice" ASC NULLS LAST, "profileCompleteness" DESC`,
  price_high: Prisma.sql`"startingPrice" DESC NULLS LAST, "profileCompleteness" DESC`,
  newest: Prisma.sql`"createdAt" DESC`,
  relevance: Prisma.sql`"categoryMatch" DESC, "cityMatch" DESC, similarity DESC, "profileCompleteness" DESC`,
  recommended: Prisma.sql`"categoryMatch" DESC, "cityMatch" DESC, similarity DESC, "profileCompleteness" DESC`,
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
  const similarity = relevanceExpr(filters.keyword);
  const categoryMatch = filters.categoryId
    ? Prisma.sql`true`
    : parsed.categoryId
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM vendor_categories vc
          WHERE vc.vendor_id = v.id AND vc.category_id = ${parsed.categoryId}::uuid
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
