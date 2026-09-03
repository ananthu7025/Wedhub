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

/**
 * Inverse of getPublicMediaUrl — recovers the raw object key from an
 * already-resolved URL. Needed when an API response hands back a
 * fully-resolved url (e.g. admin-media upload confirm) but the caller
 * needs to store it in a shape (like AdminAlbum.coverMedia) that other
 * code will later pass back through getPublicMediaUrl — storing the
 * resolved URL directly there would double-prefix it.
 */
export function getObjectKeyFromPublicMediaUrl(url: string): string {
  const base = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return url.startsWith(`${base}/`) ? url.slice(base.length + 1) : url;
}
