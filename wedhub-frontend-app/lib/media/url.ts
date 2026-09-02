const R2_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "";

/**
 * Mirrors wedhub-backend/src/integrations/storage/r2.client.ts's
 * getPublicUrl() exactly: strip trailing slashes from the base, join with
 * the object key, no signing. Some backend endpoints (search) already
 * resolve object keys to full URLs server-side; others (album media) return
 * raw object keys the frontend must resolve itself — see
 * frontenddocs/10-risks-and-open-questions.md Open Question 7.
 */
export function getPublicMediaUrl(objectKey: string): string {
  const base = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/${objectKey}`;
}
