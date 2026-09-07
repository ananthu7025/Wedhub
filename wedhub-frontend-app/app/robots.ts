import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/vendor",
        "/api",
        // /preview — Arch Phase 26 temporary wedding-website previews; each
        // page also sets its own noindex/nofollow meta, this is defense in
        // depth at the crawl-directive level too.
        "/preview",
        // Auth utility routes and the couple account/dashboard surface —
        // none of these are discovery/landing content, and none previously
        // had crawl- or page-level noindex (SEO audit finding).
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/vendor-onboarding",
        "/account",
        "/compare",
        "/enquiries",
        "/notifications",
        "/shortlist",
        "/wedding-website",
        "/reviews/write",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
