import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listAllWeddingStories } from "@/lib/api/catalog";
import type { WeddingStoriesListResponse } from "@/lib/api/vendors.types";
import { RealWeddingsView } from "./RealWeddingsView";

const REAL_WEDDINGS_DESCRIPTION =
  "Explore real Indian wedding stories, photo albums, bridal looks, mandap decor, and trusted wedding vendors behind each celebration on itsmyKalyanam.";

export const metadata: Metadata = {
  title: "Real Weddings | Real Couples & Wedding Photos",
  description: REAL_WEDDINGS_DESCRIPTION,
  alternates: {
    canonical: "/real-weddings",
  },
  openGraph: {
    title: "Real Weddings | itsmyKalyanam",
    description: REAL_WEDDINGS_DESCRIPTION,
    url: "/real-weddings",
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
  const currentPage = Math.max(1, Number(params.page) || 1);

  let initialData: WeddingStoriesListResponse = {
    stories: [],
    pagination: { page: currentPage, limit: 6, total: 0, totalPages: 1 },
    filterOptions: { locations: [], tags: [] },
  };

  try {
    const response = await listAllWeddingStories({
      page: currentPage,
      limit: 6,
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
        <RealWeddingsView
          initialData={initialData}
          currentPage={currentPage}
          searchParams={params}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
