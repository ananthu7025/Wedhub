import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listFeaturedGalleryMedia, listGalleryCategories } from "@/lib/api/catalog";
import { getActiveChallenge } from "@/lib/api/challenges";
import { GalleryPageView } from "./GalleryPageView";

const GALLERY_DESCRIPTION = "Browse real wedding decor, bridal outfits, jewelry, and creative ideas from real vendors.";

export const metadata: Metadata = {
  title: "Gallery Inspiration",
  description: GALLERY_DESCRIPTION,
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery Inspiration | itsmyKalyanam",
    description: GALLERY_DESCRIPTION,
    url: "/gallery",
  },
};

const PAGE_SIZE = 24;

interface GalleryPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { category } = await searchParams;

  const [{ data: items, meta }, { data: categories }, { data: activeChallenge }] = await Promise.all([
    listFeaturedGalleryMedia({ page: 1, limit: PAGE_SIZE, category }),
    listGalleryCategories(),
    category ? getActiveChallenge({ gallerySlug: category }) : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PublicTopbar />
      <GalleryPageView
        key={category ?? "all"}
        initialItems={items}
        initialTotalPages={meta?.totalPages ?? 1}
        categories={categories}
        activeCategory={category ?? null}
        pageSize={PAGE_SIZE}
        activeChallenge={activeChallenge}
      />
      <PublicFooter />
    </>
  );
}
