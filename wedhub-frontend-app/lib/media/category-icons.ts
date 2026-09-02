/**
 * Category has no icon/image field in the backend schema at all (confirmed —
 * see frontenddocs/10-risks-and-open-questions.md Open Question 10). This is
 * presentation-only data with no business meaning, so it stays frontend-side
 * as a static map keyed by slug rather than blocking on a schema change.
 * Falls back to a generic placeholder for any category slug not listed here.
 */
const CATEGORY_ICON_BY_SLUG: Record<string, string> = {
  photographers: "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=60",
  photographer: "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=60",
  venues: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=60",
  venue: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=60",
  "makeup-artists": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200&q=60",
  makeup: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200&q=60",
  decorators: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=200&q=60",
  decorator: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=200&q=60",
  caterers: "https://images.unsplash.com/photo-1555244162-803834f70033?w=200&q=60",
  caterer: "https://images.unsplash.com/photo-1555244162-803834f70033?w=200&q=60",
  planners: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=200&q=60",
  planner: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=200&q=60",
};

const FALLBACK_ICON = "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=60";

export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICON_BY_SLUG[slug] ?? FALLBACK_ICON;
}
