import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SeoLandingPage } from "@/components/shared/SeoLandingPage";
import { getSeoPage, listCategories, listLocations } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { resolveCitySlugAlias } from "@/lib/seo/location-aliases";
import { resolveCategoryDbSlug, resolveCategorySeoSlug } from "@/lib/seo/category-slug-map";

interface CategoryCityPageProps {
  params: Promise<{ categorySlug: string; citySlug: string }>;
}

async function loadSeoPage(categorySlug: string, citySlug: string) {
  const [{ data: categories }, { data: cities }] = await Promise.all([listCategories(), listLocations("CITY")]);
  // categorySlug is the marketing SEO slug (e.g. "wedding-photographers") —
  // resolve to the real Category.slug before matching (falls through
  // unchanged for an already-real/unknown slug).
  const realCategorySlug = resolveCategoryDbSlug(categorySlug);
  const category = categories.find((c) => c.slug === realCategorySlug);
  const city = cities.find((c) => c.slug === citySlug);
  if (!category || !city) {
    // Colloquial city name (e.g. "kochi") — redirect to the canonical
    // /category/<slug>/ernakulam URL rather than serving a second indexable
    // URL for the same real page.
    const canonicalCitySlug = resolveCitySlugAlias(citySlug);
    if (category && canonicalCitySlug !== citySlug && cities.some((c) => c.slug === canonicalCitySlug)) {
      redirect(`/category/${categorySlug}/${canonicalCitySlug}`);
    }
    notFound();
  }
  // Hit with the raw DB category slug while a marketing slug exists for it
  // — redirect to the canonical marketing URL (same duplicate-content
  // avoidance as the city-alias redirect above).
  const canonicalCategorySlug = resolveCategorySeoSlug(category.slug);
  if (canonicalCategorySlug !== categorySlug) {
    redirect(`/category/${canonicalCategorySlug}/${citySlug}`);
  }
  try {
    const { data } = await getSeoPage(category.id, city.id);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: CategoryCityPageProps): Promise<Metadata> {
  const { categorySlug, citySlug } = await params;
  const seo = await loadSeoPage(categorySlug, citySlug);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: seo.canonicalPath,
      images: seo.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: seo.ogImageUrl ? [seo.ogImageUrl] : undefined,
    },
    robots: seo.indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function CategoryCityPage({ params }: CategoryCityPageProps) {
  const { categorySlug, citySlug } = await params;
  const seo = await loadSeoPage(categorySlug, citySlug);
  return <SeoLandingPage seo={seo} />;
}
