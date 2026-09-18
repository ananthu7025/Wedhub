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

/**
 * Every R2 object key this app's own media pipeline produces for a resized
 * variant follows the exact `-thumbnail.webp` / `-medium.webp` suffix
 * `variantObjectKey()` writes in wedhub-backend's
 * media-processing.processor.ts — never any other suffix, never a
 * different width/format. A URL ending in one of these is therefore
 * already the right dimensions and already an optimally-compressed WebP;
 * asking next/image to re-fetch, re-decode, and re-encode it through
 * `/_next/image` on every distinct (url, requested-width) pair a client
 * happens to hit buys nothing and only adds a redundant Sharp pass plus a
 * cold-cache round trip on the Next server.
 *
 * A URL that does NOT match this suffix — most commonly an
 * `originalObjectKey` fallback (arbitrary uploaded dimensions, arbitrary
 * format, occasionally multi-megabyte) or an external/static asset this
 * pipeline never touched (Unsplash placeholders, `/public` images) — still
 * genuinely benefits from Next's runtime resize/re-encode, so this
 * intentionally returns false for anything it isn't certain about rather
 * than guessing.
 */
const GENERATED_VARIANT_SUFFIX = /-(?:thumbnail|medium)\.webp$/;

/**
 * Whether a media `src` is already an appropriately-sized, pre-optimized
 * variant from this app's own pipeline — the signal to pass `unoptimized`
 * to next/image so the browser fetches straight from
 * `image.itsmykalyanam.com` (Cloudflare edge cache) instead of round-
 * tripping through `/_next/image` for a re-encode that changes nothing.
 * See the reasoning on GENERATED_VARIANT_SUFFIX above. Centralized here
 * rather than duplicated per call site so the policy (and the day it needs
 * to change — e.g. if a "large" variant is reintroduced) lives in one
 * place; see lib/media/README or components using `isPreOptimizedMediaUrl`
 * for call sites.
 */
export function isPreOptimizedMediaUrl(src: string): boolean {
  return GENERATED_VARIANT_SUFFIX.test(src);
}
