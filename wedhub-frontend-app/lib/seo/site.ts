/**
 * Site-wide SEO constants — single source of truth for the brand name,
 * canonical production origin, and default social-share image, so these
 * values aren't re-typed across generateMetadata/JSON-LD call sites. Mirrors
 * the same NEXT_PUBLIC_SITE_URL env var app/layout.tsx's metadataBase,
 * app/sitemap.ts and app/robots.ts already read.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const BRAND_NAME = "itsmyKalyanam";

export const DEFAULT_DESCRIPTION =
  "Discover and connect with trusted wedding vendors near you — photographers, makeup artists, venues, planners, decorators, caterers and more across Kerala.";

// Branded fallback used for OG/Twitter image when a page has no real
// vendor/category/post image of its own (never a fabricated vendor photo).
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/hero-wedding-bg.jpg`;

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
