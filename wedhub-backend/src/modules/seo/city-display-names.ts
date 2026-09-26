// Popular colloquial names for Kerala cities, shown alongside the formal
// administrative district name in generated titles/H1/descriptions so the
// page's own on-page text reinforces what people actually type into search
// (e.g. "photographers in kochi") rather than only the canonical DB name
// ("Ernakulam"). Mirrors wedhub-frontend-app/lib/seo/location-aliases.ts,
// which resolves the same colloquial names for URL routing — that map is
// slug -> canonical slug (for redirects); this one is canonical Location.name
// -> the popular display name (for on-page text), so keep both in sync when
// adding a city.
const CITY_POPULAR_NAME: Record<string, string> = {
  Ernakulam: "Kochi",
  Thiruvananthapuram: "Trivandrum",
  Kozhikode: "Calicut",
  Thrissur: "Trichur",
};

/**
 * Returns the display form of a city name for titles/H1/descriptions: the
 * formal name with its popular alias in parentheses when one exists (e.g.
 * "Ernakulam (Kochi)"), otherwise the formal name unchanged.
 */
export function cityDisplayName(cityName: string): string {
  const popular = CITY_POPULAR_NAME[cityName];
  return popular ? `${cityName} (${popular})` : cityName;
}
