/**
 * Marketing/SEO slugs for each real Category, mirrored from
 * wedhub-backend's src/modules/seo/category-seo-slugs.ts (kept as a
 * deliberate, independently-maintained copy — see that file's header
 * comment for why: frontend route resolution needs a marketing-slug ->
 * real-Category lookup *before* any backend call can happen, so it can't
 * ask the backend over the network first).
 *
 * Same shape and same reasoning as this app's existing
 * lib/seo/location-aliases.ts city-alias map: Category.slug itself is
 * never renamed in the database (that would ripple into every existing
 * vendor-onboarding/admin/API-consumer reference to a category by slug) —
 * this is a presentation-only mapping used solely to resolve/construct
 * public-facing URLs like /category/wedding-photographers/ernakulam.
 *
 * IMPORTANT: keep this in sync with the backend's CATEGORY_SEO_SLUGS. A
 * category with no entry here falls back to its own real slug (see
 * resolveCategorySeoSlug), so this never breaks for a newly-added category
 * — it just won't have a prettified marketing slug until one is added on
 * both sides.
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
export function resolveCategorySeoSlug(realSlug: string): string {
  return CATEGORY_SEO_SLUGS[realSlug] ?? realSlug;
}

const REVERSE_CATEGORY_SEO_SLUGS: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SEO_SLUGS).map(([realSlug, seoSlug]) => [seoSlug, realSlug]),
);

/**
 * Marketing SEO slug (or a raw real slug, or an unknown slug) -> real
 * Category.slug, e.g. "wedding-photographers" -> "photography-videography".
 * Returns the input unchanged when it's not a known marketing alias — this
 * lets a URL hit with the raw DB slug (e.g. an old link, or a category with
 * no marketing slug yet) still resolve, same fallback behavior as
 * resolveCitySlugAlias.
 */
export function resolveCategoryDbSlug(seoSlug: string): string {
  return REVERSE_CATEGORY_SEO_SLUGS[seoSlug] ?? seoSlug;
}
