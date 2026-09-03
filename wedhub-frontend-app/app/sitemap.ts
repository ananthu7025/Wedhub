import type { MetadataRoute } from "next";
import { listSeoCombinations } from "@/lib/api/catalog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Single sitemap for now — real vendor/category/city inventory is small
// enough to stay well under the 50,000-URL-per-sitemap limit. Segment via
// generateSitemaps() (see product.md §44 "segmented if necessary") once
// combinations grow large enough to need it.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: combinations } = await listSeoCombinations();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.8 },
  ];

  const combinationEntries: MetadataRoute.Sitemap = combinations.map((combo) => ({
    url: `${SITE_URL}${combo.canonicalPath}`,
    changeFrequency: "weekly",
    priority: combo.pageType === "CATEGORY_CITY" ? 0.9 : 0.7,
  }));

  return [...staticEntries, ...combinationEntries];
}
