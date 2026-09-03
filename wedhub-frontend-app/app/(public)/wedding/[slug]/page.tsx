import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WeddingWebsiteRenderer } from "@/components/wedding-website/WeddingWebsiteRenderer";
import { getPublishedWeddingWebsite } from "@/lib/api/wedding-website";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ApiRequestError } from "@/lib/api/types";

interface PublishedPageProps {
  params: Promise<{ slug: string }>;
}

async function loadWebsite(slug: string) {
  try {
    const { data } = await getPublishedWeddingWebsite(slug);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PublishedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const website = await loadWebsite(slug);

  const title = `${website.brideName} & ${website.groomName} | Wedding`;
  const description = website.shortDescription ?? `Join ${website.brideName} & ${website.groomName} as they celebrate their wedding.`;
  const coverKey = website.coverMedia?.optimizedObjectKey ?? website.coverMedia?.originalObjectKey;

  return {
    title,
    description,
    alternates: { canonical: `/wedding/${slug}` },
    openGraph: {
      title,
      description,
      url: `/wedding/${slug}`,
      images: coverKey ? [{ url: getPublicMediaUrl(coverKey) }] : undefined,
    },
    // Real, indexable content per Business Rule (published websites are
    // indexable) — no thin-page gating needed here, publication itself
    // (a real, verified ₹49 payment) is the gate.
    robots: { index: true, follow: true },
  };
}

export default async function PublishedWeddingWebsitePage({ params }: PublishedPageProps) {
  const { slug } = await params;
  const website = await loadWebsite(slug);
  return (
    <WeddingWebsiteRenderer website={website} canonicalUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/wedding/${slug}`} mode="published" />
  );
}
