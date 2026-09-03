import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/shared/SeoLandingPage";
import { getSeoPage, listCategories } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
}

async function loadSeoPage(categorySlug: string) {
  const { data: categories } = await listCategories();
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) {
    notFound();
  }
  try {
    const { data } = await getSeoPage(category.id, undefined);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const seo = await loadSeoPage(categorySlug);
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;
  const seo = await loadSeoPage(categorySlug);
  return <SeoLandingPage seo={seo} />;
}
