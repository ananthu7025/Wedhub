/**
 * Marketing/SEO slugs for each real Category, keyed by the real
 * Category.slug seeded in prisma/seed.ts (WEDDING_CATEGORIES, slugified via
 * that file's own slugify()). This is a frontend-facing presentation
 * concern only — Category.slug itself is never renamed (renaming it would
 * ripple into every existing vendor-onboarding/admin/API-consumer reference
 * to a category by slug) — same reasoning and same shape as this app's
 * existing wedhub-frontend-app/lib/seo/location-aliases.ts city-alias map.
 *
 * Centralized here (not duplicated on the frontend) because both
 * canonicalPath() below and listIndexableCombinations() need the mapped
 * slug, and the frontend only ever receives it pre-resolved via
 * SeoPageData.canonicalPath / SeoCombination.canonicalPath — it never needs
 * its own copy of this table for routing. The frontend's category page
 * routes still need a *reverse* lookup (marketing slug -> real Category, to
 * call GET /seo/page) — see wedhub-frontend-app/lib/seo/category-slug-map.ts,
 * which is intentionally kept as a thin, independently-maintained mirror of
 * this table (frontend route resolution happens before any backend call,
 * so it can't ask this table over the network first).
 *
 * Every real, currently-seeded category must have an entry here. A
 * category with no entry falls back to its own real slug (see
 * toSeoCategorySlug), so adding a new Category never breaks — it just
 * won't have a prettified marketing slug until one is added here.
 */
export const CATEGORY_SEO_SLUGS: Record<string, string> = {
  "photography-videography": "wedding-photographers",
  venues: "wedding-venues",
  "makeup-artists": "bridal-makeup-artists",
  "mehendi-artists": "mehndi-artists",
  decorators: "wedding-decorators",
  caterers: "wedding-caterers",
  "bridal-wear": "bridal-wear",
  "groom-wear": "groom-wear",
  jewellery: "wedding-jewellery",
  "cakes-desserts": "wedding-cakes",
  "artists-djs": "wedding-djs-artists",
  "cocktail-bar-services": "wedding-bar-services",
  "wedding-cars-luxury-rentals": "wedding-car-rentals",
  "event-planners": "wedding-planners",
};

/** Real Category.slug -> marketing SEO slug, e.g. "photography-videography" -> "wedding-photographers". */
export function toSeoCategorySlug(realSlug: string): string {
  return CATEGORY_SEO_SLUGS[realSlug] ?? realSlug;
}

const REVERSE_CATEGORY_SEO_SLUGS: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SEO_SLUGS).map(([realSlug, seoSlug]) => [seoSlug, realSlug]),
);

/** Marketing SEO slug -> real Category.slug, e.g. "wedding-photographers" -> "photography-videography". */
export function fromSeoCategorySlug(seoSlug: string): string {
  return REVERSE_CATEGORY_SEO_SLUGS[seoSlug] ?? seoSlug;
}
