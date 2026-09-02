import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { CategoryCapsuleCarousel } from "@/components/shared/CategoryCapsuleCarousel";
import { GalleryInspiration } from "@/components/shared/GalleryInspiration";
import { VendorCard } from "@/components/shared/VendorCard";
import { listFeaturedCategories, listFeaturedListings, searchVendors } from "@/lib/api/catalog";
import { getOptionalSession } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "WedHub — Your Wedding, Your Way | Find Trusted Vendors",
  description: "Discover and connect with trusted wedding vendors near you — photographers, venues, makeup artists and more.",
};

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "VendorMatefinderBot";

async function getFeaturedVendorCards() {
  try {
    const { data: listings } = await listFeaturedListings("HOMEPAGE", 8);
    if (!listings || listings.length === 0) return [];

    // featured-listings only returns {id, businessName, slug} per vendor — no
    // logo/price. Cross-reference against search to get a renderable card.
    const results = await Promise.all(
      listings.map(async (listing) => {
        try {
          const { data } = await searchVendors({ keyword: listing.vendor.businessName, limit: 5 });
          return data.find((v) => v.slug === listing.vendor.slug) ?? null;
        } catch {
          return null;
        }
      }),
    );
    return results.filter((v) => v !== null);
  } catch {
    return [];
  }
}

// TODO(backend): no "curated/trending search" concept exists in the
// backend today — this is static placeholder content, not sourced from
// any API. Once a CMS content model exists (see backend Arch Phase 17,
// docs/09-stage-growth-and-scale.md), replace with a real editorial/
// analytics-driven "popular searches" endpoint instead of hardcoding.
const POPULAR_SEARCH_CARDS = [
  {
    title: "4 Star & Above Wedding Hotels",
    location: "Bengaluru, Delhi, Mumbai",
    price: "₹1,800 per plate onwards",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80",
    link: "/search?keyword=Hotel",
  },
  {
    title: "Banquet Halls with Price",
    location: "Over 500+ AC Banquet Halls",
    price: "₹800 per plate onwards",
    imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=500&q=80",
    link: "/search?keyword=Banquet",
  },
  {
    title: "Resorts for Destination Wedding",
    location: "Goa, Jaipur, Udaipur, Kerala",
    price: "₹2,50,000 per day onwards",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&q=80",
    link: "/search?keyword=Resort",
  },
  {
    title: "Lawns / Farmhouses",
    location: "Spacious Outdoor & Green Venues",
    price: "₹1,200 per plate onwards",
    imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=500&q=80",
    link: "/search?keyword=Lawn",
  },
];




// TODO(backend): no "real wedding story"/case-study model exists in the
// backend (no Prisma model, no endpoint) — static placeholder content.
// This is CMS content-model scope (backend Arch Phase 17); replace once
// that ships rather than continuing to hand-maintain this array. Per
// explicit user decision (2026-09-03), this stays static rather than
// being backed by real vendor media — restyled with the bento grid's
// card visual language (image, dark gradient overlay, hover scale,
// "View More" pill) previously used for Popular Categories, which is now
// its own fully real, category-driven section above
// (CategoryCapsuleCarousel) — see Open Question 21. Rendered as a simple
// 2-row, 3-per-row grid.
const REAL_WEDDING_STORIES = [
  {
    couple: "Ananya & Rohan",
    location: "Palace Grounds, Bengaluru",
    tag: "South Indian Traditional · 120 Photos",
    imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    snippet: "A grand floral celebration featuring traditional kanjeevaram silk and majestic temple-style decor.",
  },
  {
    couple: "Pooja & Kabir",
    location: "City Palace, Jaipur",
    tag: "Royal Heritage Wedding · 85 Photos",
    imageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80",
    snippet: "An opulent royal Rajasthani celebration with folk performances, royal processions, and palace courtyards.",
  },
  {
    couple: "Meera & Siddharth",
    location: "Heritage Village, Goa",
    tag: "Beachside Destination · 95 Photos",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    snippet: "A serene sunset beach ceremony filled with fairy-lit coconut groves, bohemian decor, and endless joy.",
  },
  {
    couple: "Kavya & Arjun",
    location: "Backwater Resort, Alleppey",
    tag: "Kerala Christian Wedding · 140 Photos",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    snippet: "A tranquil backwater ceremony with houseboat processions and traditional sadhya feast.",
  },
  {
    couple: "Ishaan & Diya",
    location: "The Leela, Udaipur",
    tag: "Lakeside Luxury Wedding · 200 Photos",
    imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80",
    snippet: "A three-day lakeside celebration with rooftop sangeet and a sunset lake-view mandap.",
  },
  {
    couple: "Nikhil & Sara",
    location: "Heritage Haveli, Jodhpur",
    tag: "Rajasthani Fusion · 110 Photos",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    snippet: "A blue-city haveli wedding blending Rajasthani rituals with a modern fusion reception.",
  },
];

// TODO(backend): blog/article content is explicitly backend Arch Phase 17
// scope (CMS & SEO Backend, see docs/09-stage-growth-and-scale.md and
// frontenddocs/07-stage-growth-and-hardening.md's Frontend Arch Phase
// 11b) — not started. This is static placeholder content until then.
const LATEST_BLOGS = [
  {
    title: "Top 12 Trending Bridal Lehenga Colors For 2026",
    category: "Bridal Fashion",
    readTime: "5 min read",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80",
    date: "Sep 2026",
  },
  {
    title: "The Ultimate Indian Wedding Planning Checklist & Timeline",
    category: "Wedding Planning",
    readTime: "8 min read",
    imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
    date: "Aug 2026",
  },
  {
    title: "15 Hidden Gem Pre-Wedding Photoshoot Locations In India",
    category: "Photography Ideas",
    readTime: "6 min read",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    date: "Aug 2026",
  },
];

export default async function HomePage() {
  const [{ data: featuredCategories }, featuredVendors, session] = await Promise.all([
    listFeaturedCategories(),
    getFeaturedVendorCards(),
    getOptionalSession(),
  ]);

  return (
    <div className="min-h-screen bg-surface-page">
      <PublicTopbar />

      {/* Hero Section — strictly preserving user copy & search form, enhanced with generated wedding background */}
      <section className="relative m-6 overflow-hidden rounded-[24px] px-8 py-16 text-white shadow-xl max-[900px]:m-4 max-[900px]:px-6 max-[900px]:py-10">
        {/* High resolution Indian wedding photography background */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: "url('/images/hero-wedding-bg.jpg')" }}
        />
        {/* Elegant dark gradient overlay ensuring crisp contrast & readability */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30 backdrop-blur-[0.5px]" />

        <div className="relative z-10 max-w-3xl">
          <p className="mb-3 text-[13px] font-bold tracking-wider text-white/90 uppercase">
            PLANNING YOUR WEDDING?
          </p>
          <h1 className="mb-6 max-w-xl text-[38px] leading-tight font-extrabold tracking-tight text-white drop-shadow-sm max-[900px]:text-[28px]">
            Discover and connect with trusted wedding vendors near you.
          </h1>

          <form
            action="/search"
            className="flex max-w-[640px] items-center gap-2 rounded-full bg-white p-2 pl-6 shadow-[0_12px_36px_rgba(0,0,0,0.35)]"
          >
            <input
              name="keyword"
              type="text"
              placeholder="Search photographers, venues, makeup artists..."
              className="flex-1 border-none py-2.5 text-sm text-text-dark outline-none placeholder:text-text-grey"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-white shadow-md transition-transform hover:scale-105 hover:bg-brand-primary-hover"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
          </form>

          Popular Searches Quick Tags
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/90">
            <span className="font-semibold text-white/75">Popular:</span>
            {[
              { label: "Bridal Makeup", query: "bridal makeup" },
              { label: "Wedding Photographers", query: "photographer" },
              { label: "Banquet Halls", query: "banquet" },
              { label: "Destination Resorts", query: "resort" },
              { label: "Mehndi Artists", query: "mehndi" },
            ].map((item) => (
              <Link
                key={item.label}
                href={`/search?keyword=${encodeURIComponent(item.query)}`}
                className="rounded-full bg-white/20 px-3 py-1 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-jet-black"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Searches / Venues Strip (4 Cards) */}
      <section className="px-6 py-6 max-[900px]:px-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-jet-black">
            Popular Searches
          </h2>
          <Link href="/search" className="text-xs font-bold text-brand-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_SEARCH_CARDS.map((item) => (
            <Link
              key={item.title}
              href={item.link}
              className="group flex overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md no-underline text-inherit"
            >
              <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-surface-input">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="96px"
                />
              </div>
              <div className="ml-3.5 flex flex-1 flex-col justify-center">
                <h3 className="text-xs font-bold text-jet-black line-clamp-1 group-hover:text-brand-primary">
                  {item.title}
                </h3>
                <p className="text-[11px] text-text-grey mt-0.5">{item.location}</p>
                <p className="text-[11px] font-bold text-brand-primary mt-1">{item.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Wedding Categories Capsule Carousel (Matching User Design Reference) */}
      <CategoryCapsuleCarousel categories={featuredCategories} />

      {/* Real Wedding Stories — bento-style cards (image, dark gradient
          overlay, hover scale, "View More" pill) in a simple 2-row,
          3-per-row grid, per explicit user decision, 2026-09-03 (reduced
          from the original 8-card asymmetric layout to 6 entries, 2 rows
          of 3). Still static placeholder content — see
          REAL_WEDDING_STORIES's own TODO(backend) comment. */}
      <section id="wedding-stories" className="px-6 py-14 sm:py-16 max-[900px]:px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-jet-black sm:text-2xl">
              Real Wedding Stories
            </h2>
            <p className="mt-0.5 text-xs text-text-grey">
              Get inspired by real couples, stunning celebrations, and dream wedding vendors
            </p>
          </div>
          <Link href="/search" className="text-xs font-bold text-brand-primary hover:underline">
            View All Weddings →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {REAL_WEDDING_STORIES.map((story) => (
            <WeddingStoryCard key={story.couple} story={story} className="h-[195px] sm:h-[210px]" />
          ))}
        </div>
      </section>

      {/* Latest Blogs & Planning Ideas */}
      <section id="wedding-blogs" className="px-6 py-8 max-[900px]:px-4 bg-white/70 border-y border-border/60">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-jet-black">
              Latest Blogs &amp; Advice
            </h2>
            <p className="text-xs text-text-grey mt-0.5">Expert tips, styling advice, and practical planning guides</p>
          </div>
          <Link href="/search" className="text-xs font-bold text-brand-primary hover:underline">
            Read More Articles →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LATEST_BLOGS.map((blog) => (
            <div
              key={blog.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-surface-input">
                <Image
                  src={blog.imageUrl}
                  alt={blog.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span className="absolute top-2.5 left-2.5 rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-jet-black backdrop-blur-xs">
                  {blog.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-text-grey mb-1.5">
                    <span>{blog.date}</span>
                    <span>&bull;</span>
                    <span>{blog.readTime}</span>
                  </div>
                  <h3 className="text-sm font-bold text-jet-black group-hover:text-brand-primary transition-colors line-clamp-2 leading-snug">
                    {blog.title}
                  </h3>
                </div>
                <Link
                  href="/search"
                  className="mt-3 text-xs font-bold text-brand-primary hover:underline"
                >
                  Read Article →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery Inspiration Component */}
      <GalleryInspiration />

      {/* Featured Vendors — real data only (featuredVendors comes from a
          real GET /featured-listings + search cross-reference, see
          getFeaturedVendorCards above); no fabricated placeholder vendors,
          since a fake vendor card would link to a slug that 404s. */}
      {featuredVendors.length > 0 && (
        <section className="px-6 py-10 max-[900px]:px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-jet-black">
                Featured Vendors &amp; Services
              </h2>
              <p className="text-xs text-text-grey mt-0.5">Top-rated, verified wedding professionals ready for your date</p>
            </div>
            <Link href="/search" className="text-xs font-bold text-brand-primary hover:underline">
              View All Vendors →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Telegram Wedding Assistant Matchmaker Banner (Preserved from existing code) */}
      <section className="px-6 pb-12 max-[900px]:px-4">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-[#ffe4eb] via-[#ffccd7] to-[#ffdce4] p-8 border border-[#f5b8c6] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0088cc] shadow-md flex-shrink-0">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-jet-black">Not sure where to start?</h3>
              <p className="max-w-[440px] text-xs text-text-grey mt-0.5">
                Chat with our AI-powered Telegram wedding matchmaker and get paired with the best vendors in minutes.
              </p>
            </div>
          </div>
          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(224,11,65,0.25)] transition-all hover:bg-brand-primary-hover hover:shadow-lg active:scale-95"
          >
            Chat on Telegram
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      {/* Comprehensive WedHub Footer */}
      <PublicFooter />
    </div>
  );
}

interface WeddingStory {
  couple: string;
  location: string;
  tag: string;
  imageUrl: string;
  snippet: string;
}

/** One bento-style Real Wedding Stories card — same visual language (image, dark gradient overlay, hover scale, white "View More" pill) as the asymmetric grid this section's layout was ported from. */
/** Text/badge/button reveal only on hover, matching CategoryCapsuleCarousel.tsx's reveal pattern — the image is always visible, everything else fades + slides in on hover. */
function WeddingStoryCard({ story, className }: { story: WeddingStory; className: string }) {
  return (
    <Link
      href="/search"
      className={`group relative overflow-hidden rounded-[18px] shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between p-3.5 sm:p-4 text-white no-underline ${className}`}
    >
      <Image
        src={story.imageUrl}
        alt={story.couple}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 768px) 100vw, 33vw"
      />

      {/* Top shade — revealed on hover */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 via-black/35 to-transparent z-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {/* Bottom shade — revealed on hover */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
        <span className="inline-block rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {story.tag}
        </span>
      </div>

      <div className="relative z-10 flex flex-col gap-2">
        <div className="opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow">{story.couple}</h3>
          <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 drop-shadow-xs line-clamp-1">{story.location}</p>
          <p className="text-[10px] sm:text-[11px] text-white/90 mt-0.5 drop-shadow-xs line-clamp-2">{story.snippet}</p>
        </div>
        {/* "View More" pill — always visible, unlike the rest of the card's text */}
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-jet-black shadow-sm transition-transform group-hover:scale-105">
          View More ↗
        </span>
      </div>
    </Link>
  );
}
