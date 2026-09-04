"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { WeddingStoriesListResponse } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { DisplayRealWeddingStory, RealWeddingCollageCard } from "./RealWeddingCollageCard";

// Exactly 6 curated sample stories with unique, high-resolution photography for each card
const EXACT_6_SAMPLE_STORIES: DisplayRealWeddingStory[] = [
  {
    id: "sample-1",
    coupleName: "Ananya & Rohan",
    location: "Palace Grounds, Bengaluru",
    tag: "South Indian Traditional",
    snippet: "A grand floral celebration featuring traditional Kanjeevaram silk and majestic temple-style decor.",
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80",
    galleryPhotos: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80",
      "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=500&q=80",
    ],
    photoCountLabel: "+120 Photos",
  },
  {
    id: "sample-2",
    coupleName: "Pooja & Kabir",
    location: "City Palace, Jaipur",
    tag: "Royal Heritage Wedding",
    snippet: "An opulent royal Rajasthani celebration with folk performances, royal processions, and palace courtyards.",
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    coverImageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80",
    galleryPhotos: [
      "https://images.unsplash.com/photo-1544078751-58fee2d8a03b?w=500&q=80",
      "https://images.unsplash.com/photo-1546804784-896d0dca3805?w=500&q=80",
    ],
    photoCountLabel: "+85 Photos",
  },
  {
    id: "sample-3",
    coupleName: "Meera & Siddharth",
    location: "Heritage Village, Goa",
    tag: "Beachside Destination",
    snippet: "A serene sunset beach ceremony filled with fairy-lit coconut groves, bohemian decor, and endless joy.",
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    coverImageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
    galleryPhotos: [
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=500&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&q=80",
    ],
    photoCountLabel: "+95 Photos",
  },
  {
    id: "sample-4",
    coupleName: "Kavya & Arjun",
    location: "Backwater Resort, Alleppey",
    tag: "Kerala Christian Wedding",
    snippet: "A tranquil backwater ceremony with houseboat processions and traditional sadhya feast.",
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    galleryPhotos: [
      "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=500&q=80",
      "https://images.unsplash.com/photo-1529636798458-92182e662485?w=500&q=80",
    ],
    photoCountLabel: "+140 Photos",
  },
  {
    id: "sample-5",
    coupleName: "Ishaan & Diya",
    location: "The Leela, Udaipur",
    tag: "Lakeside Luxury Wedding",
    snippet: "A three-day lakeside celebration with rooftop sangeet and a sunset lake-view mandap.",
    vendorName: "Frame & Co. Photography",
    vendorSlug: "frame-co-photography",
    coverImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    galleryPhotos: [
      "https://images.unsplash.com/photo-1509927083803-4bd519298ac4?w=500&q=80",
      "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=500&q=80",
    ],
    photoCountLabel: "+200 Photos",
  },
  {
    id: "sample-6",
    coupleName: "Nikhil & Sara",
    location: "Heritage Haveli, Jodhpur",
    tag: "Rajasthani Fusion",
    snippet: "A blue-city haveli wedding blending Rajasthani rituals with a modern fusion reception.",
    vendorName: "Lens & Light Studios",
    vendorSlug: "lens-light-studios",
    coverImageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&q=80",
    galleryPhotos: [
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=500&q=80",
      "https://images.unsplash.com/photo-1519225438550-48fc97a02565?w=500&q=80",
    ],
    photoCountLabel: "+110 Photos",
  },
];

interface RealWeddingsViewProps {
  initialData: WeddingStoriesListResponse;
}

export function RealWeddingsView({ initialData }: RealWeddingsViewProps) {
  // Map real database stories to display cards
  const realDisplayStories: DisplayRealWeddingStory[] = useMemo(() => {
    return (initialData.stories ?? []).map((s) => {
      const coverKey = s.album.coverMedia?.optimizedObjectKey ?? s.album.coverMedia?.originalObjectKey;
      const galleryKeys = (s.album.media ?? [])
        .map((m) => m.optimizedObjectKey ?? m.originalObjectKey)
        .filter(Boolean) as string[];

      return {
        id: s.id,
        coupleName: s.coupleName,
        location: s.location,
        tag: s.tag,
        snippet: s.snippet,
        vendorName: s.album.vendor.businessName,
        vendorSlug: s.album.vendor.slug,
        coverImageUrl: coverKey ? getPublicMediaUrl(coverKey) : "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80",
        galleryPhotos: galleryKeys.slice(0, 2).map((k) => getPublicMediaUrl(k)),
        photoCountLabel: s.album.media && s.album.media.length > 0 ? `+${s.album.media.length + 1} Photos` : undefined,
      };
    });
  }, [initialData.stories]);

  // Real stories fill first; exactly 6 items total without repetition
  const displayedStories = useMemo(() => {
    const totalSlots = 6;
    if (realDisplayStories.length >= totalSlots) {
      return realDisplayStories.slice(0, totalSlots);
    }
    const remaining = totalSlots - realDisplayStories.length;
    return [...realDisplayStories, ...EXACT_6_SAMPLE_STORIES.slice(0, remaining)];
  }, [realDisplayStories]);

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Hero Banner with Generated Photographic Background */}
      <section className="relative overflow-hidden py-16 sm:py-24 text-white">
        {/* Photographic Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/real-weddings-hero.jpg"
            alt="Real Weddings Background"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Elegant Dark Vignette Overlay for Crisp Legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/80" />
        </div>

        {/* Banner Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block rounded-full bg-white/20 px-3.5 py-1 text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-white backdrop-blur-md mb-3.5 border border-white/25">
            Real Weddings Inspiration
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-md text-white">
            itsmyKalyanam Real Weddings
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base lg:text-lg font-semibold text-white/95 tracking-wide drop-shadow-sm">
            REAL COUPLES • REAL STORIES • REAL INSPIRATION
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-white/85 leading-relaxed drop-shadow-xs">
            Explore authentic wedding celebrations, royal palace setups, and verified vendor albums from couples across India.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Breadcrumb & Results Meta Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-4">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-grey font-medium">
            <Link href="/" className="hover:text-crimson transition-colors no-underline">
              Home
            </Link>
            <span>/</span>
            <span className="font-bold text-jet-black">Real Weddings</span>
          </nav>

          {/* Results Count */}
          <div className="text-xs font-semibold text-text-grey">
            Showing <strong className="text-jet-black font-extrabold">{displayedStories.length}</strong> real wedding stories
          </div>
        </div>

        {/* 3-Column Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {displayedStories.map((story) => (
            <RealWeddingCollageCard key={story.id} story={story} />
          ))}
        </div>

        {/* Numbered Pagination Bar */}
        <div className="mt-14 flex justify-center">
          <nav aria-label="Pagination" className="inline-flex items-center gap-1.5 rounded-2xl border border-border/80 bg-white p-1.5 shadow-xs">
            <button
              type="button"
              disabled
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-jet-black opacity-30 pointer-events-none"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-all ${
                  p === 1
                    ? "bg-crimson text-white shadow-sm"
                    : "text-jet-black hover:bg-surface-input"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-jet-black transition-colors hover:bg-surface-input"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </nav>
        </div>

        {/* Editorial SEO Blurb (Matching WedMeGood Footer Section) */}
        <section className="mt-16 rounded-2xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-jet-black">Real Indian Wedding Inspiration — Curated by itsmyKalyanam</h2>
          <p className="mt-2 text-xs sm:text-sm text-text-grey leading-relaxed">
            Planning your dream wedding starts with authentic inspiration. itsmyKalyanam&apos;s Real Weddings showcase features real couples celebrating across majestic palaces in Rajasthan, tranquil backwaters in Kerala, breezy beaches in Goa, and grand banquets across metropolitan India. Every wedding story features verified photography albums, decor highlights, and direct links to the trusted wedding planners, photographers, and makeup artists who brought their vision to life.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-crimson">
            <Link href="/vendors" className="hover:underline no-underline">
              Explore Wedding Vendors →
            </Link>
            <Link href="/vendors" className="hover:underline no-underline">
              Find Wedding Photographers →
            </Link>
            <Link href="/wedding/new" className="hover:underline no-underline">
              Create Your Free Wedding Website →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
