import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /preview — Arch Phase 26 temporary wedding-website previews; each
      // page also sets its own noindex/nofollow meta, this is defense in
      // depth at the crawl-directive level too.
      disallow: ["/admin", "/vendor", "/api", "/preview"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
