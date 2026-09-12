/**
 * Common colloquial/alternate names for Kerala cities, mapped to the
 * canonical Location.slug seeded in wedhub-backend/prisma/seed.ts. The
 * Location model has no alias column (adding one is a schema change —
 * out of scope for a URL-resolution fix), so this is a frontend-only,
 * backward-compatible map: a visitor hitting /city/trivandrum or
 * /category/venues/kochi resolves to the same real Location record that
 * /city/thiruvananthapuram or /category/venues/ernakulam would, instead of
 * 404ing on a name that's extremely common in real-world search/typing but
 * isn't the formal administrative district name stored as canonical.
 */
export const LOCATION_SLUG_ALIASES: Record<string, string> = {
  trivandrum: "thiruvananthapuram",
  tvm: "thiruvananthapuram",
  cochin: "ernakulam",
  kochi: "ernakulam",
  calicut: "kozhikode",
  trichur: "thrissur",
};

/** Resolves a possibly-colloquial city slug to its canonical form; returns the input unchanged if it's not a known alias. */
export function resolveCitySlugAlias(slug: string): string {
  return LOCATION_SLUG_ALIASES[slug.toLowerCase()] ?? slug;
}
