import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listCategories, listLocations, searchVendors } from "@/lib/api/catalog";
import type { SearchSort } from "@/lib/api/vendors.types";
import { getOptionalSession } from "@/lib/auth/dal";
import { SearchFilterBar } from "./SearchFilterBar";
import { SearchResultsView } from "./SearchResultsView";

export const metadata: Metadata = {
  title: "Find Wedding Vendors",
  description: "Search and filter trusted wedding vendors by category, location, and budget.",
};

interface SearchPageProps {
  searchParams: Promise<{
    keyword?: string;
    categoryId?: string;
    cityId?: string;
    priceMin?: string;
    priceMax?: string;
    verified?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  // Architectural Guard: Without any active filter, redirect to /vendors directory
  if (
    !params.categoryId &&
    !params.keyword?.trim() &&
    !params.cityId &&
    !params.priceMin &&
    !params.priceMax &&
    !params.verified
  ) {
    redirect("/vendors");
  }

  const rawPage = params.page ? Number(params.page) : 1;
  const page = typeof rawPage === "number" && !isNaN(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const rawPriceMin = params.priceMin ? Number(params.priceMin) : undefined;
  const priceMin = typeof rawPriceMin === "number" && !isNaN(rawPriceMin) && rawPriceMin >= 0 ? rawPriceMin : undefined;
  const rawPriceMax = params.priceMax ? Number(params.priceMax) : undefined;
  const priceMax = typeof rawPriceMax === "number" && !isNaN(rawPriceMax) && rawPriceMax >= 0 ? rawPriceMax : undefined;

  const [{ data: vendors, meta }, { data: categories }, { data: cities }, session] = await Promise.all([
    searchVendors({
      keyword: params.keyword?.trim() || undefined,
      categoryId: params.categoryId || undefined,
      cityId: params.cityId || undefined,
      priceMin,
      priceMax,
      verified: params.verified === "true" ? true : undefined,
      sort: (params.sort as SearchSort) || undefined,
      page,
      limit: 20,
    }),
    listCategories(),
    listLocations("CITY"),
    getOptionalSession(),
  ]);

  const selectedCategory = categories.find((c) => c.id === params.categoryId);
  const selectedCity = cities.find((c) => c.id === params.cityId);

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col justify-between">
      <div>
        <PublicTopbar />

        {/* WedMeGood Horizontal Dropdown Filter Strip */}
        <SearchFilterBar
          categories={categories}
          cities={cities}
          currentCategory={selectedCategory}
          currentCity={selectedCity}
          priceMin={priceMin}
          priceMax={priceMax}
          verified={params.verified === "true"}
          sort={(params.sort as SearchSort) || "relevance"}
        />

        {/* Search Results Area */}
        <SearchResultsView
          vendors={vendors}
          total={meta?.total ?? vendors.length}
          categories={categories}
          cities={cities}
          selectedCategory={selectedCategory}
          selectedCity={selectedCity}
          keyword={params.keyword?.trim()}
          priceMin={priceMin}
          priceMax={priceMax}
          verified={params.verified === "true"}
          page={page}
          totalPages={meta?.totalPages ?? 1}
          isAuthenticated={session !== null}
        />
      </div>

      <PublicFooter />
    </div>
  );
}
