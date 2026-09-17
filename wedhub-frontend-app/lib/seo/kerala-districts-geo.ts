/**
 * Real, public approximate centroid coordinates for Kerala's 14 districts
 * (district headquarters/town coordinates — standard public geographic
 * data, not fabricated), keyed by the same Location.slug seeded in
 * wedhub-backend/prisma/seed.ts's INDIA_STATES list. Used only for
 * client-side "nearest district" matching (see NearMeLink.tsx) — this is
 * deliberately NOT stored on the Location model (no schema migration for a
 * single UX feature); if a real per-vendor/per-venue geo search is ever
 * built, that belongs on Vendor.latitude/longitude (which already exists),
 * not here.
 */
export const KERALA_DISTRICT_CENTROIDS: Record<string, { name: string; lat: number; lng: number }> = {
  thiruvananthapuram: { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
  kollam: { name: "Kollam", lat: 8.8932, lng: 76.6141 },
  pathanamthitta: { name: "Pathanamthitta", lat: 9.2648, lng: 76.7870 },
  alappuzha: { name: "Alappuzha", lat: 9.4981, lng: 76.3388 },
  kottayam: { name: "Kottayam", lat: 9.5916, lng: 76.5222 },
  idukki: { name: "Idukki", lat: 9.8497, lng: 76.9681 },
  ernakulam: { name: "Ernakulam", lat: 9.9816, lng: 76.2999 },
  thrissur: { name: "Thrissur", lat: 10.5276, lng: 76.2144 },
  palakkad: { name: "Palakkad", lat: 10.7867, lng: 76.6548 },
  malappuram: { name: "Malappuram", lat: 11.0510, lng: 76.0711 },
  kozhikode: { name: "Kozhikode", lat: 11.2588, lng: 75.7804 },
  wayanad: { name: "Wayanad", lat: 11.6854, lng: 76.1320 },
  kannur: { name: "Kannur", lat: 11.8745, lng: 75.3704 },
  kasaragod: { name: "Kasaragod", lat: 12.4996, lng: 74.9869 },
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in kilometers between two lat/lng points (haversine formula). */
function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds the nearest known Kerala district (by centroid distance) to a
 * given lat/lng — returns its Location.slug (e.g. "ernakulam") plus the
 * approximate distance in km, or null if the point is absurdly far from
 * every district (see MAX_REASONABLE_DISTANCE_KM) — a visitor outside
 * Kerala entirely shouldn't be silently mapped to whichever district
 * happens to be geometrically closest.
 */
const MAX_REASONABLE_DISTANCE_KM = 400;

export function findNearestKeralaDistrict(lat: number, lng: number): { slug: string; name: string; distanceKm: number } | null {
  let nearestSlug: string | null = null;
  let nearestDistance = Infinity;

  for (const [slug, district] of Object.entries(KERALA_DISTRICT_CENTROIDS)) {
    const distance = haversineDistanceKm(lat, lng, district.lat, district.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSlug = slug;
    }
  }

  if (!nearestSlug || nearestDistance > MAX_REASONABLE_DISTANCE_KM) {
    return null;
  }

  return { slug: nearestSlug, name: KERALA_DISTRICT_CENTROIDS[nearestSlug]!.name, distanceKm: Math.round(nearestDistance) };
}
