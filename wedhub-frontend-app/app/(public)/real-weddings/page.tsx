import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listAllWeddingStories } from "@/lib/api/catalog";
import type { WeddingStoriesListResponse } from "@/lib/api/vendors.types";
import { RealWeddingsView } from "./RealWeddingsView";

export const metadata: Metadata = {
  title: "Real Weddings | Real Couples & Wedding Photos",
  description:
    "Explore real Indian wedding stories, photo albums, bridal looks, mandap decor, and trusted wedding vendors behind each celebration on itsmyKalyanam.",
  alternates: {
    canonical: "/real-weddings",
  },
};

interface RealWeddingsPageProps {
  searchParams: Promise<{
    location?: string;
    tag?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function RealWeddingsPage({ searchParams }: RealWeddingsPageProps) {
  const params = await searchParams;

  let initialData: WeddingStoriesListResponse = {
    stories: [],
    pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
    filterOptions: { locations: [], tags: [] },
  };

  try {
    const response = await listAllWeddingStories({
      page: params.page ? Number(params.page) : 1,
      limit: 12,
      location: params.location,
      tag: params.tag,
      search: params.search,
      sort: params.sort,
    });
    initialData = response.data;
  } catch (error) {
    console.error("Failed to load real wedding stories:", error);
  }

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <PublicTopbar />
      <main>
        <RealWeddingsView initialData={initialData} />
      </main>
      <PublicFooter />
    </div>
  );
}
