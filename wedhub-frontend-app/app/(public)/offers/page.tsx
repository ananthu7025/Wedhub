import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listCategories, listOffers } from "@/lib/api/catalog";
import { getOptionalSession } from "@/lib/auth/dal";
import { listMyShortlistedVendorIds } from "@/lib/api/shortlists";
import type { OfferSort } from "@/lib/api/vendor-offers.types";
import { OfferFilterBar } from "./OfferFilterBar";
import { OfferWallView } from "./OfferWallView";

export const metadata: Metadata = {
  title: "Offer Wall",
  description: "Browse discounted and promotional wedding vendor packages, all in one place.",
  alternates: { canonical: "/offers" },
  openGraph: {
    title: "Offer Wall | itsmyKalyanam",
    description: "Browse discounted and promotional wedding vendor packages, all in one place.",
    url: "/offers",
  },
};

interface OffersPageProps {
  searchParams: Promise<{
    categoryId?: string;
    priceMin?: string;
    priceMax?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const params = await searchParams;

  const rawPage = params.page ? Number(params.page) : 1;
  const page = typeof rawPage === "number" && !isNaN(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const rawPriceMin = params.priceMin ? Number(params.priceMin) : undefined;
  const priceMin = typeof rawPriceMin === "number" && !isNaN(rawPriceMin) && rawPriceMin >= 0 ? rawPriceMin : undefined;
  const rawPriceMax = params.priceMax ? Number(params.priceMax) : undefined;
  const priceMax = typeof rawPriceMax === "number" && !isNaN(rawPriceMax) && rawPriceMax >= 0 ? rawPriceMax : undefined;

  const [{ data: offers, meta }, { data: categories }, session] = await Promise.all([
    listOffers({
      categoryId: params.categoryId || undefined,
      priceMin,
      priceMax,
      sort: (params.sort as OfferSort) || undefined,
      page,
      limit: 24,
    }),
    listCategories(),
    getOptionalSession(),
  ]);

  const selectedCategory = categories.find((c) => c.id === params.categoryId);

  const favoritedVendorIds = session !== null ? [...(await listMyShortlistedVendorIds())] : [];

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col justify-between">
      <div>
        <PublicTopbar activeHref="/offers" />

        <OfferFilterBar
          categories={categories}
          currentCategory={selectedCategory}
          priceMin={priceMin}
          priceMax={priceMax}
          sort={(params.sort as OfferSort) || "newest"}
        />

        <OfferWallView
          offers={offers}
          total={meta?.total ?? offers.length}
          page={page}
          totalPages={meta?.totalPages ?? 1}
          isAuthenticated={session !== null}
          favoritedVendorIds={favoritedVendorIds}
        />
      </div>

      <PublicFooter />
    </div>
  );
}
