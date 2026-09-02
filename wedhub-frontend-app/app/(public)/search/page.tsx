import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { VendorCard } from "@/components/shared/VendorCard";
import { listCategories, listLocations, searchVendors } from "@/lib/api/catalog";
import type { SearchSort } from "@/lib/api/vendors.types";
import { getOptionalSession } from "@/lib/auth/dal";
import { SortSelect } from "./SortSelect";

export const metadata: Metadata = {
  title: "Find Vendors",
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
  const page = params.page ? Number(params.page) : 1;

  const [{ data: vendors, meta }, { data: categories }, { data: cities }, session] = await Promise.all([
    searchVendors({
      keyword: params.keyword,
      categoryId: params.categoryId,
      cityId: params.cityId,
      priceMin: params.priceMin ? Number(params.priceMin) : undefined,
      priceMax: params.priceMax ? Number(params.priceMax) : undefined,
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

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged = { ...params, page: undefined, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    return `/search?${next.toString()}`;
  }

  return (
    <>
      <PublicTopbar />

      <div className="flex items-start gap-7 px-10 py-6 max-[900px]:flex-col max-[900px]:px-4">
        <aside className="w-[260px] flex-shrink-0 max-[900px]:w-full">
          <div className="rounded-xl border border-border bg-white p-5">
            <form action="/search" className="contents">
              <div className="border-b border-border pb-4.5">
                <h4 className="mb-3 text-[13px] font-bold">Category</h4>
                <div className="flex flex-col gap-1.5">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={buildUrl({ categoryId: params.categoryId === category.id ? undefined : category.id })}
                      className={`rounded-md px-2 py-1.5 text-sm no-underline ${
                        params.categoryId === category.id
                          ? "bg-brand-primary-soft font-semibold text-brand-primary"
                          : "text-text-body hover:bg-surface-input"
                      }`}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-b border-border py-4.5">
                <h4 className="mb-3 text-[13px] font-bold">Location</h4>
                <select name="cityId" defaultValue={params.cityId ?? ""} className="w-full rounded-md border border-border px-3 py-2.5 text-sm">
                  <option value="">All cities</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-b border-border py-4.5">
                <h4 className="mb-3 text-[13px] font-bold">Budget (starting price)</h4>
                <div className="flex items-center gap-2">
                  <input name="priceMin" type="number" placeholder="Min" defaultValue={params.priceMin} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
                  <span className="text-text-grey">–</span>
                  <input name="priceMax" type="number" placeholder="Max" defaultValue={params.priceMax} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
                </div>
              </div>

              <div className="py-4.5">
                <h4 className="mb-3 text-[13px] font-bold">Trust</h4>
                <label className="flex items-center gap-2 text-sm text-text-body">
                  <input type="checkbox" name="verified" value="true" defaultChecked={params.verified === "true"} className="accent-brand-primary" />
                  Verified only
                </label>
              </div>

              {selectedCategory && <input type="hidden" name="categoryId" value={selectedCategory.id} />}
              {params.keyword && <input type="hidden" name="keyword" value={params.keyword} />}

              <button type="submit" className="w-full rounded-md border border-border bg-white py-2.5 text-[13px] font-bold hover:bg-surface-input">
                Apply filters
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <form action="/search" className="mb-4.5 flex items-center gap-3 rounded-full border border-border bg-white p-1.5 pl-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-text-grey">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input name="keyword" type="text" defaultValue={params.keyword} placeholder="Search vendors..." className="flex-1 border-none py-2 text-sm outline-none" />
            {params.categoryId && <input type="hidden" name="categoryId" value={params.categoryId} />}
            {params.cityId && <input type="hidden" name="cityId" value={params.cityId} />}
            <button type="submit" className="rounded-full bg-jet-black-90 px-4 py-2 text-[13px] font-bold text-white hover:bg-jet-black-70">
              Search
            </button>
          </form>

          <div className="mb-4.5 flex items-center justify-between">
            <span className="text-sm text-text-grey">
              <strong className="text-text-dark">{meta?.total ?? vendors.length}</strong>
              {selectedCategory ? ` ${selectedCategory.name.toLowerCase()}` : " vendors"} found
            </span>
            <SortSelect currentSort={params.sort ?? "relevance"} />
          </div>

          {vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-input text-text-grey">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </div>
              <h3 className="mb-1.5 text-[15px] font-bold">No vendors found</h3>
              <p className="max-w-[320px] text-[13px] text-text-grey">Try adjusting your filters or searching a different category or city.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-2">
              {vendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendorId={vendor.id}
                  slug={vendor.slug}
                  businessName={vendor.businessName}
                  logoUrl={vendor.logoUrl}
                  shortDescription={vendor.shortDescription}
                  startingPrice={vendor.startingPrice}
                  currency={vendor.currency}
                  isAuthenticated={session !== null}
                />
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="rounded-md border border-border bg-white px-4 py-2 text-sm no-underline">
                  ← Previous
                </Link>
              )}
              <span className="px-3 text-sm text-text-grey">
                Page {meta.page} of {meta.totalPages}
              </span>
              {page < meta.totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} className="rounded-md border border-border bg-white px-4 py-2 text-sm no-underline">
                  Next →
                </Link>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
