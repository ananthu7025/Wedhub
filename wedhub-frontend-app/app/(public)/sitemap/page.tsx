import type { Metadata } from "next";
import Link from "next/link";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listCategories, listLocations } from "@/lib/api/catalog";
import { resolveCategorySeoSlug } from "@/lib/seo/category-slug-map";

export const metadata: Metadata = {
  title: "Sitemap | itsmyKalyanam",
  description:
    "Explore all wedding vendor categories, Kerala cities, planning tools, photo galleries, and real wedding features on itsmyKalyanam.",
  alternates: { canonical: "/sitemap" },
  openGraph: {
    title: "Sitemap | itsmyKalyanam",
    description:
      "Explore all wedding vendor categories, Kerala cities, planning tools, and wedding inspiration on itsmyKalyanam.",
    url: "/sitemap",
  },
};

export const revalidate = 3600;

export default async function SitemapPage() {
  const [{ data: categories }, { data: cities }] = await Promise.all([
    listCategories().catch(() => ({ data: [] })),
    listLocations("CITY").catch(() => ({ data: [] })),
  ]);

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col justify-between">
      <div>
        <PublicTopbar />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 text-xs text-text-grey" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand-primary hover:underline">
              Home
            </Link>{" "}
            / <span className="font-semibold text-jet-black">Sitemap</span>
          </nav>

          {/* Page Header */}
          <div className="mb-10 border-b border-border pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-jet-black sm:text-3xl">
                  itsmyKalyanam Sitemap
                </h1>
                <p className="mt-1.5 text-sm text-text-grey max-w-2xl">
                  A comprehensive directory of all pages, vendor categories, Kerala cities, wedding planning tools, and inspiration.
                </p>
              </div>

              {/* Link to XML sitemap for crawlers / developers */}
              <div className="mt-2 sm:mt-0">
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-semibold text-text-dark shadow-xs transition-colors hover:border-brand-primary hover:text-brand-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Raw XML Sitemap</span>
                  <span className="text-[10px] text-text-grey">↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Grid of Sitemap Sections */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Section 1: Main Pages & Planning Tools */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-brand-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <h2 className="text-base font-bold text-jet-black">Explore &amp; Plan</h2>
              </div>
              <ul className="space-y-2.5 text-sm text-text-grey">
                <li>
                  <Link href="/" className="transition-colors hover:text-brand-primary hover:underline">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/vendors" className="transition-colors hover:text-brand-primary hover:underline">
                    All Wedding Vendors Directory
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="transition-colors hover:text-brand-primary hover:underline">
                    Search &amp; Filter Vendors
                  </Link>
                </li>
                <li>
                  <Link href="/shortlist" className="transition-colors hover:text-brand-primary hover:underline">
                    Saved Shortlist
                  </Link>
                </li>
                <li>
                  <Link href="/compare" className="transition-colors hover:text-brand-primary hover:underline">
                    Compare Vendors Tool
                  </Link>
                </li>
                <li>
                  <Link href="/wedding-website" className="transition-colors hover:text-brand-primary hover:underline">
                    Free Wedding Website Builder
                  </Link>
                </li>
                <li>
                  <Link href="/reviews/write" className="transition-colors hover:text-brand-primary hover:underline">
                    Write a Vendor Review
                  </Link>
                </li>
                <li>
                  <Link href="/enquiries" className="transition-colors hover:text-brand-primary hover:underline">
                    My Enquiries
                  </Link>
                </li>
              </ul>
            </div>

            {/* Section 2: Ideas, Stories & Community */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-brand-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <h2 className="text-base font-bold text-jet-black">Ideas, Gallery &amp; Community</h2>
              </div>
              <ul className="space-y-2.5 text-sm text-text-grey">
                <li>
                  <Link href="/real-weddings" className="transition-colors hover:text-brand-primary hover:underline">
                    Real Wedding Stories
                  </Link>
                </li>
                <li>
                  <Link href="/gallery" className="transition-colors hover:text-brand-primary hover:underline">
                    Photo Inspiration Gallery
                  </Link>
                </li>
                <li>
                  <Link href="/gallery?category=outfit" className="transition-colors hover:text-brand-primary hover:underline">
                    Bridal Lehenga &amp; Outfits
                  </Link>
                </li>
                <li>
                  <Link href="/gallery?category=decor-ideas" className="transition-colors hover:text-brand-primary hover:underline">
                    Mandap &amp; Stage Decor Ideas
                  </Link>
                </li>
                <li>
                  <Link href="/gallery?category=wedding-photography" className="transition-colors hover:text-brand-primary hover:underline">
                    Pre-Wedding Photoshoots
                  </Link>
                </li>
                <li>
                  <Link href="/gallery?category=mehndi" className="transition-colors hover:text-brand-primary hover:underline">
                    Bridal Mehndi Designs
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="transition-colors hover:text-brand-primary hover:underline">
                    Kerala Wedding Blog &amp; Guides
                  </Link>
                </li>
                <li>
                  <Link href="/community" className="transition-colors hover:text-brand-primary hover:underline">
                    Couples Community &amp; Advice
                  </Link>
                </li>
              </ul>
            </div>

            {/* Section 3: Vendor Portal & Business */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-brand-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <h2 className="text-base font-bold text-jet-black">For Wedding Vendors</h2>
              </div>
              <ul className="space-y-2.5 text-sm text-text-grey">
                <li>
                  <Link href="/signup?type=vendor" className="font-semibold text-brand-primary hover:underline">
                    Register as a Vendor →
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="transition-colors hover:text-brand-primary hover:underline">
                    Vendor Dashboard Login
                  </Link>
                </li>
                <li>
                  <Link href="/challenges" className="transition-colors hover:text-brand-primary hover:underline">
                    Vendor Showcase &amp; Challenges
                  </Link>
                </li>
                <li>
                  <a href="mailto:contact@itsmykalyanam.com" className="transition-colors hover:text-brand-primary hover:underline">
                    Partner Support: contact@itsmykalyanam.com
                  </a>
                </li>
                <li>
                  <a href="tel:8921399415" className="transition-colors hover:text-brand-primary hover:underline">
                    Helpline: +91 89213 99415
                  </a>
                </li>
              </ul>
            </div>

            {/* Section 4: Browse All Categories */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-xs md:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4 text-brand-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <h2 className="text-base font-bold text-jet-black">
                  Wedding Categories ({categories.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 text-sm text-text-grey">
                {categories.map((cat) => {
                  const seoSlug = resolveCategorySeoSlug(cat.slug);
                  return (
                    <Link
                      key={cat.id}
                      href={`/category/${seoSlug}`}
                      className="transition-colors hover:text-brand-primary hover:underline truncate"
                      title={cat.name}
                    >
                      {cat.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Browse by City */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-brand-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <h2 className="text-base font-bold text-jet-black">
                  Locations &amp; Cities ({cities.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-text-grey">
                {cities.map((city) => (
                  <Link
                    key={city.id}
                    href={`/city/${city.slug}`}
                    className="transition-colors hover:text-brand-primary hover:underline truncate"
                    title={city.name}
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Section 6: Popular Category + City Combinations */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-xs md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 mb-4 text-brand-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <h2 className="text-base font-bold text-jet-black">
                  Popular Searches Across Kerala
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2.5 text-sm text-text-grey">
                <Link href="/category/wedding-venues/kochi" className="hover:text-brand-primary hover:underline truncate">
                  Wedding Venues in Kochi
                </Link>
                <Link href="/category/wedding-venues/thiruvananthapuram" className="hover:text-brand-primary hover:underline truncate">
                  Wedding Venues in Thiruvananthapuram
                </Link>
                <Link href="/category/wedding-venues/kozhikode" className="hover:text-brand-primary hover:underline truncate">
                  Wedding Venues in Kozhikode
                </Link>
                <Link href="/category/wedding-venues/thrissur" className="hover:text-brand-primary hover:underline truncate">
                  Wedding Venues in Thrissur
                </Link>
                <Link href="/category/wedding-photographers/kochi" className="hover:text-brand-primary hover:underline truncate">
                  Photographers in Kochi
                </Link>
                <Link href="/category/wedding-photographers/kozhikode" className="hover:text-brand-primary hover:underline truncate">
                  Photographers in Kozhikode
                </Link>
                <Link href="/category/wedding-photographers/thiruvananthapuram" className="hover:text-brand-primary hover:underline truncate">
                  Photographers in Thiruvananthapuram
                </Link>
                <Link href="/category/wedding-photographers/malappuram" className="hover:text-brand-primary hover:underline truncate">
                  Photographers in Malappuram
                </Link>
                <Link href="/category/bridal-makeup-artists/kochi" className="hover:text-brand-primary hover:underline truncate">
                  Bridal Makeup in Kochi
                </Link>
                <Link href="/category/bridal-makeup-artists/kozhikode" className="hover:text-brand-primary hover:underline truncate">
                  Bridal Makeup in Kozhikode
                </Link>
                <Link href="/category/wedding-decorators/kochi" className="hover:text-brand-primary hover:underline truncate">
                  Decorators in Kochi
                </Link>
                <Link href="/category/wedding-caterers/thrissur" className="hover:text-brand-primary hover:underline truncate">
                  Catering Services in Thrissur
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
