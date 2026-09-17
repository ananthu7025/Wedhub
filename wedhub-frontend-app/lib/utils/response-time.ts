// Item 4: turns Vendor.avgResponseTimeMs (an all-time average in
// milliseconds, denormalized in wedhub-backend's lead.repository.ts) into
// a human-readable bucket for display — never shows a raw duration, since
// an average isn't a promise and a specific "4h 12m" reads as more precise
// than the underlying signal actually is.
export function formatResponseTimeBucket(avgResponseTimeMs: number | null): string | null {
  if (avgResponseTimeMs === null) return null;
  const hours = avgResponseTimeMs / (60 * 60 * 1000);
  if (hours <= 1) return "Usually replies within an hour";
  if (hours <= 6) return "Usually replies within a few hours";
  if (hours <= 24) return "Usually replies within a day";
  if (hours <= 72) return "Usually replies within a few days";
  return "Usually replies within a week or more";
}
