import type { MetadataRoute } from "next";
import { listBlogPosts, listSeoCombinations } from "@/lib/api/catalog";
import { listPublishedWeddingWebsiteSlugs } from "@/lib/api/wedding-website";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Every published blog post's slug, for the sitemap entries below —
// paginated at the backend's max allowed limit of 100 per request.
// Safe fallback with try/catch ensures prerender does not fail the build.
async function listAllPublishedBlogSlugs() {
  try {
    const firstPage = await listBlogPosts({ page: 1, limit: 100 });
    const posts = [...(firstPage.data ?? [])];
    const totalPages = firstPage.meta?.totalPages ?? 1;

    for (let page = 2; page <= totalPages; page++) {
      const nextPage = await listBlogPosts({ page, limit: 100 });
      posts.push(...(nextPage.data ?? []));
    }

    return posts;
  } catch (error) {
    console.error("Failed to fetch blog posts for sitemap:", error);
    return [];
  }
}

// Single sitemap for now — real vendor/category/city inventory is small
// enough to stay well under the 50,000-URL-per-sitemap limit. Segment via
// generateSitemaps() (see product.md §44 "segmented if necessary") once
// combinations grow large enough to need it.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [combinationsRes, weddingWebsitesRes, blogPosts] = await Promise.all([
    listSeoCombinations().catch((err) => {
      console.error("Failed to fetch SEO combinations for sitemap:", err);
      return { data: [] };
    }),
    listPublishedWeddingWebsiteSlugs().catch((err) => {
      console.error("Failed to fetch wedding websites for sitemap:", err);
      return { data: [] };
    }),
    listAllPublishedBlogSlugs(),
  ]);

  const combinations = combinationsRes.data ?? [];
  const weddingWebsites = weddingWebsitesRes.data ?? [];

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "daily", priority: 0.7 },
  ];

  const combinationEntries: MetadataRoute.Sitemap = combinations.map((combo) => ({
    url: `${SITE_URL}${combo.canonicalPath}`,
    changeFrequency: "weekly",
    priority: combo.pageType === "CATEGORY_CITY" ? 0.9 : 0.7,
  }));

  // Preview URLs (/preview/:token) are deliberately never included — only
  // PUBLISHED websites are indexable (Business Rule 7).
  const weddingWebsiteEntries: MetadataRoute.Sitemap = weddingWebsites.map((site) => ({
    url: `${SITE_URL}/wedding/${site.slug}`,
    lastModified: site.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...combinationEntries, ...weddingWebsiteEntries, ...blogEntries];
}
