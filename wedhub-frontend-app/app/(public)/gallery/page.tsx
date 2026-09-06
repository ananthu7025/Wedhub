import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listFeaturedGalleryMedia, listGalleryCategories } from "@/lib/api/catalog";
import { GalleryPageView } from "./GalleryPageView";

export const metadata: Metadata = {
  title: "Gallery Inspiration",
  description: "Browse real wedding decor, bridal outfits, jewelry, and creative ideas from real vendors.",
};

const PAGE_SIZE = 24;

interface GalleryPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { category } = await searchParams;

  const [{ data: items, meta }, { data: categories }] = await Promise.all([
    listFeaturedGalleryMedia({ page: 1, limit: PAGE_SIZE, category }),
    listGalleryCategories(),
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
      />
      <PublicFooter />
    </>
  );
}
