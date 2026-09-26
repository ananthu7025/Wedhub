import { NotFoundError, ValidationError } from "../../common/errors";
import * as seoRepository from "./seo.repository";
import { toSeoCategorySlug } from "./category-seo-slugs";
import { cityDisplayName } from "./city-display-names";
import type { CreateSeoOverrideBody, UpdateSeoOverrideBody } from "./seo.schema";

// product.md §44: "Avoid creating thin pages automatically. Only index
// pages with useful content and meaningful vendor inventory." Below this
// many real, APPROVED vendors, the page still renders (so search/social
// links never 404) but is marked non-indexable and excluded from the
// sitemap.
export const MIN_VENDORS_FOR_INDEXABLE_PAGE = 3;

export interface SeoPageData {
  pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY";
  title: string;
  h1: string;
  description: string;
  canonicalPath: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
  vendorCount: number;
  indexable: boolean;
  category: { id: string; name: string; slug: string } | null;
  city: { id: string; name: string; slug: string } | null;
}

// No "| itsmyKalyanam" suffix here — the frontend root layout's title
// template ("%s | itsmyKalyanam") already appends it to every page's
// <title>, so including it here would double it up (e.g.
// "Best Photography | itsmyKalyanam | itsmyKalyanam").
//
// "in Kerala" is added ONLY on the category-only page (no city) — that's
// the one case where the page gives no location signal at all otherwise
// (this platform is Kerala-only — prisma/seed.ts, confirmed with the user
// 2026-09-06). The category+city case already names the real city, so
// appending "Kerala" there too would be redundant keyword-stuffing
// (product.md §44 / architecture explicitly warns against this).
//
// City names run through cityDisplayName() so a search like "photographers
// in kochi" is matched by the page's own title/H1/description text, not
// just the URL-alias redirect (/category/wedding-photographers/kochi ->
// .../ernakulam) — the formal district name alone ("Ernakulam") never
// contains the colloquial term most people actually type.
function templateTitle(categoryName: string | null, cityName: string | null): string {
  if (categoryName && cityName) return `Best ${categoryName} in ${cityDisplayName(cityName)}`;
  if (categoryName) return `Best ${categoryName} in Kerala`;
  return `Wedding Vendors in ${cityDisplayName(cityName!)}`;
}

function templateH1(categoryName: string | null, cityName: string | null): string {
  if (categoryName && cityName) return `${categoryName} in ${cityDisplayName(cityName)}`;
  if (categoryName) return `${categoryName} in Kerala`;
  return `Wedding Vendors in ${cityDisplayName(cityName!)}`;
}

function templateDescription(categoryName: string | null, cityName: string | null, vendorCount: number): string {
  const subject = categoryName && cityName
    ? `${categoryName.toLowerCase()} in ${cityDisplayName(cityName)}`
    : categoryName
    ? `${categoryName.toLowerCase()} in Kerala`
    : `wedding vendors in ${cityDisplayName(cityName!)}`;
  return `Browse ${vendorCount} verified ${subject} on itsmyKalyanam. Compare portfolios, pricing, and reviews to find the right fit for your wedding.`;
}

// Not literally /vendors/<category>/<city> per the architecture.md Phase 17
// example routes — that collides with the already-shipped /vendors/[slug]
// vendor-detail route (Next.js forbids two differently-named dynamic
// segments at the same route level, and 14+ files already link to
// /vendors/[slug]). /category and /city are the equivalent, non-colliding
// routes actually implemented on the frontend.
//
// categorySlug here is the real Category.slug (e.g.
// "photography-videography") — it's translated to its marketing SEO slug
// (e.g. "wedding-photographers") via toSeoCategorySlug() so the canonical/
// sitemap URL a real visitor and Google see is the human-friendly one, not
// the raw database slug. The frontend route (still literally named
// [categorySlug] in the App Router) accepts and resolves this SEO slug —
// see wedhub-frontend-app/lib/seo/category-slug-map.ts.
function canonicalPath(categorySlug: string | null, citySlug: string | null): string {
  const seoCategorySlug = categorySlug ? toSeoCategorySlug(categorySlug) : null;
  if (seoCategorySlug && citySlug) return `/category/${seoCategorySlug}/${citySlug}`;
  if (seoCategorySlug) return `/category/${seoCategorySlug}`;
  return `/city/${citySlug}`;
}

export async function getSeoPage(categoryId: string | undefined, cityId: string | undefined): Promise<SeoPageData> {
  const [category, city] = await Promise.all([
    categoryId ? seoRepository.findCategoryById(categoryId) : null,
    cityId ? seoRepository.findLocationById(cityId) : null,
  ]);

  if (categoryId && !category) {
    throw new NotFoundError("Category not found");
  }
  if (cityId && !city) {
    throw new NotFoundError("City not found");
  }

  const pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY" = category && city ? "CATEGORY_CITY" : category ? "CATEGORY" : "CITY";

  const [vendorCount, override] = await Promise.all([
    seoRepository.countVendors(category?.id, city?.id),
    seoRepository.findOverride(pageType, category?.id ?? null, city?.id ?? null),
  ]);

  const categoryName = category?.name ?? null;
  const cityName = city?.name ?? null;
  const title = override?.title ?? templateTitle(categoryName, cityName);
  const description = override?.description ?? templateDescription(categoryName, cityName, vendorCount);
  const indexable = !override?.noIndex && vendorCount >= MIN_VENDORS_FOR_INDEXABLE_PAGE;

  return {
    pageType,
    title,
    h1: templateH1(categoryName, cityName),
    description,
    canonicalPath: canonicalPath(category?.slug ?? null, city?.slug ?? null),
    // OG tags aren't run through the frontend's title template (that only
    // applies to <title>), so the brand suffix is added explicitly here.
    ogTitle: `${title} | itsmyKalyanam`,
    ogDescription: description,
    ogImageUrl: override?.ogImageUrl ?? category?.imageUrl ?? null,
    vendorCount,
    indexable,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    city: city ? { id: city.id, name: city.name, slug: city.slug } : null,
  };
}

// Backs the frontend's sitemap.ts — every real Category × real CITY-type
// Location pair, plus category-only and city-only pages, filtered down to
// only the indexable ones (per MIN_VENDORS_FOR_INDEXABLE_PAGE) so the
// sitemap never advertises a thin page to a crawler.
export async function listIndexableCombinations(): Promise<
  Array<{ pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY"; canonicalPath: string; categorySlug: string | null; citySlug: string | null }>
> {
  const [categories, cities] = await Promise.all([seoRepository.findAllActiveCategories(), seoRepository.findAllActiveCities()]);

  const candidates: Array<{ pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY"; categoryId?: string; cityId?: string; categorySlug: string | null; citySlug: string | null }> = [
    ...categories.map((c) => ({ pageType: "CATEGORY" as const, categoryId: c.id, categorySlug: c.slug, citySlug: null })),
    ...cities.map((c) => ({ pageType: "CITY" as const, cityId: c.id, categorySlug: null, citySlug: c.slug })),
    ...categories.flatMap((cat) =>
      cities.map((city) => ({ pageType: "CATEGORY_CITY" as const, categoryId: cat.id, cityId: city.id, categorySlug: cat.slug, citySlug: city.slug })),
    ),
  ];

  const counts = await Promise.all(candidates.map((c) => seoRepository.countVendors(c.categoryId, c.cityId)));

  return candidates
    .map((c, i) => ({ ...c, vendorCount: counts[i] as number }))
    .filter((c) => c.vendorCount >= MIN_VENDORS_FOR_INDEXABLE_PAGE)
    .map((c) => ({
      pageType: c.pageType,
      canonicalPath: canonicalPath(c.categorySlug, c.citySlug),
      categorySlug: c.categorySlug,
      citySlug: c.citySlug,
    }));
}

export function listOverrides(pageType: "CATEGORY" | "CITY" | "CATEGORY_CITY" | undefined) {
  return seoRepository.findAllOverrides(pageType);
}

export async function createOverride(input: CreateSeoOverrideBody) {
  if (input.categoryId) {
    const category = await seoRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new ValidationError("categoryId does not reference an existing category");
    }
  }
  if (input.cityId) {
    const city = await seoRepository.findLocationById(input.cityId);
    if (!city) {
      throw new ValidationError("cityId does not reference an existing location");
    }
  }

  return seoRepository.createOverride({
    pageType: input.pageType,
    categoryId: input.categoryId ?? null,
    locationId: input.cityId ?? null,
    title: input.title,
    description: input.description,
    ogImageUrl: input.ogImageUrl,
    noIndex: input.noIndex,
  });
}

export async function updateOverride(id: string, input: UpdateSeoOverrideBody) {
  const existing = await seoRepository.findOverrideById(id);
  if (!existing) {
    throw new NotFoundError("SEO override not found");
  }

  return seoRepository.updateOverride(id, {
    title: input.title,
    description: input.description,
    ogImageUrl: input.ogImageUrl,
    noIndex: input.noIndex,
  });
}

export async function deleteOverride(id: string): Promise<void> {
  const existing = await seoRepository.findOverrideById(id);
  if (!existing) {
    throw new NotFoundError("SEO override not found");
  }
  await seoRepository.deleteOverride(id);
}
