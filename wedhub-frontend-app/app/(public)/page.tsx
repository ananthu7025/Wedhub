import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { VendorCard } from "@/components/shared/VendorCard";
import { listCategories, listFeaturedListings, searchVendors } from "@/lib/api/catalog";
import { getCategoryIcon } from "@/lib/media/category-icons";
import { getOptionalSession } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "WedHub — Find trusted wedding vendors",
  description: "Discover and connect with trusted wedding vendors near you — photographers, venues, makeup artists and more.",
};

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "VendorMatefinderBot";

async function getFeaturedVendorCards() {
  const { data: listings } = await listFeaturedListings("HOMEPAGE", 8);
  if (listings.length === 0) return [];

  // featured-listings only returns {id, businessName, slug} per vendor — no
  // logo/price. Cross-reference against search to get a renderable card.
  // See frontenddocs/10-risks-and-open-questions.md Open Question 10.
  const results = await Promise.all(
    listings.map(async (listing) => {
      const { data } = await searchVendors({ keyword: listing.vendor.businessName, limit: 5 });
      return data.find((v) => v.slug === listing.vendor.slug) ?? null;
    }),
  );
  return results.filter((v) => v !== null);
}

export default async function HomePage() {
  const [{ data: categories }, featuredVendors, session] = await Promise.all([
    listCategories(),
    getFeaturedVendorCards(),
    getOptionalSession(),
  ]);

  return (
    <>
      <PublicTopbar />

      <section className="m-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-reseda-green-70 to-jet-black-90 px-12 py-14 text-white max-[900px]:m-4 max-[900px]:px-6 max-[900px]:py-9">
        <p className="mb-3 text-[13px] font-bold tracking-wide text-white/80 uppercase">Planning your wedding?</p>
        <h1 className="mb-5 max-w-xl text-[36px] leading-tight font-bold max-[900px]:text-[26px]">
          Discover and connect with trusted wedding vendors near you.
        </h1>
        <form action="/search" className="flex max-w-[640px] items-center gap-2 rounded-full bg-white p-2 pl-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <input
            name="keyword"
            type="text"
            placeholder="Search photographers, venues, makeup artists..."
            className="flex-1 border-none py-2.5 text-sm text-text-dark outline-none"
          />
          <button
            type="submit"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-jet-black-90 text-white hover:bg-jet-black-70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
        </form>
      </section>

      <section className="px-10 pb-10 max-[900px]:px-4">
        <h2 className="mb-4.5 text-xl font-bold">Browse by category</h2>
        <div className="flex gap-4 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/search?categoryId=${category.id}`}
              className="w-[120px] flex-shrink-0 text-center no-underline text-inherit"
            >
              <div
                className="mx-auto mb-2.5 h-24 w-24 rounded-full bg-surface-input bg-cover bg-center"
                style={{ backgroundImage: `url(${getCategoryIcon(category.slug)})` }}
              />
              <div className="text-[13px] font-bold">{category.name}</div>
            </Link>
          ))}
          {categories.length === 0 && <p className="text-sm text-text-grey">No categories available yet.</p>}
        </div>
      </section>

      {featuredVendors.length > 0 && (
        <section className="px-10 pb-10 max-[900px]:px-4">
          <div className="mb-4.5 flex items-center justify-between">
            <h2 className="text-xl font-bold">Featured vendors</h2>
            <Link href="/search" className="text-[13px] font-bold text-brand-primary no-underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-5 max-[900px]:grid-cols-2">
            {featuredVendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendorId={vendor.id}
                slug={vendor.slug}
                businessName={vendor.businessName}
                logoUrl={vendor.logoUrl}
                shortDescription={vendor.shortDescription}
                startingPrice={vendor.startingPrice}
                currency={vendor.currency}
                featured
                isAuthenticated={session !== null}
              />
            ))}
          </div>
        </section>
      )}

      <section className="px-10 pb-10 max-[900px]:px-4">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl bg-brand-primary-soft p-8">
          <div>
            <h3 className="mb-1.5 text-lg font-bold">Not sure where to start?</h3>
            <p className="max-w-[420px] text-[13px] text-text-grey">
              Chat with our Telegram assistant and get matched with the right vendors in minutes.
            </p>
          </div>
          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-brand-primary px-5 py-3 text-sm font-bold text-white no-underline shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
          >
            Chat on Telegram
          </a>
        </div>
      </section>
    </>
  );
}
