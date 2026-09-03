import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/shared/SeoLandingPage";
import { getSeoPage, listLocations } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";

interface CityPageProps {
  params: Promise<{ citySlug: string }>;
}

async function loadSeoPage(citySlug: string) {
  const { data: cities } = await listLocations("CITY");
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) {
    notFound();
  }
  try {
    const { data } = await getSeoPage(undefined, city.id);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const seo = await loadSeoPage(citySlug);
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

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const seo = await loadSeoPage(citySlug);
  return <SeoLandingPage seo={seo} />;
}
