import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/shared/SeoLandingPage";
import { getSeoPage, listCategories, listLocations } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";

interface CategoryCityPageProps {
  params: Promise<{ categorySlug: string; citySlug: string }>;
}

async function loadSeoPage(categorySlug: string, citySlug: string) {
  const [{ data: categories }, { data: cities }] = await Promise.all([listCategories(), listLocations("CITY")]);
  const category = categories.find((c) => c.slug === categorySlug);
  const city = cities.find((c) => c.slug === citySlug);
  if (!category || !city) {
    notFound();
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
    robots: seo.indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function CategoryCityPage({ params }: CategoryCityPageProps) {
  const { categorySlug, citySlug } = await params;
  const seo = await loadSeoPage(categorySlug, citySlug);
  return <SeoLandingPage seo={seo} />;
}
