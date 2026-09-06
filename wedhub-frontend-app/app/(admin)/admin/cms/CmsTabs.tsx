"use client";

import { useState } from "react";
import type {
  AdminAlbum,
  AdminApprovedMedia,
  AdminBlogPost,
  AdminFeaturedMedia,
  AdminPopularSearchCard,
  AdminVendorListItem,
  AdminWeddingStory,
} from "@/lib/api/admin.types";
import type { GalleryCategory } from "@/lib/api/vendors.types";
import { WeddingStoriesBoard } from "./WeddingStoriesBoard";
import { GalleryInspirationSection } from "./GalleryInspirationSection";
import { PopularSearchCardsBoard } from "./PopularSearchCardsBoard";
import { BlogPostsBoard } from "./BlogPostsBoard";

type Tab = "overview" | "real-weddings" | "gallery" | "popular-searches" | "blog";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "real-weddings", label: "Real Weddings" },
  { id: "gallery", label: "Gallery" },
  { id: "popular-searches", label: "Popular Searches" },
  { id: "blog", label: "Blog" },
];

const STILL_STUB_ITEMS = ["Pages", "Guides", "FAQs", "Banners"];

// Purely a visual wrapper — title/description/live count sit in a sticky
// header above each tab's existing board, which keeps its own "+ Add"
// button and inline forms exactly where they already were internally
// (lifting those up too would mean restructuring 4 differently-shaped
// boards' internal add/cancel state for a cosmetic reorder).
function TabHeader({ title, description, count }: { title: string; description: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 flex items-start justify-between gap-3 rounded-t-xl border-b border-border bg-white px-6 py-4">
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mt-0.5 text-[13px] text-text-grey">{description}</p>
      </div>
      <span className="shrink-0 rounded-full bg-surface-input px-2.5 py-1 text-xs font-bold text-text-dark">{count}</span>
    </div>
  );
}

/**
 * Rearranges the CMS's existing content (unchanged) into a tabbed layout
 * instead of one long stacked scroll — purely a navigation/UX change, no
 * new content or data. Overview's stat counts and "jump to" cards are read
 * straight off the same server-fetched initial* arrays every board below
 * already uses; they reflect what loaded the page, not live in-tab edits,
 * which matches every other admin summary count in this codebase (e.g.
 * CatalogBoard's "Homepage-featured categories (N)").
 */
export function CmsTabs({
  albums,
  approvedMedia,
  weddingStories,
  featuredMedia,
  popularSearchCards,
  blogPosts,
  vendors,
  galleryCategories,
}: {
  albums: AdminAlbum[];
  approvedMedia: AdminApprovedMedia[];
  weddingStories: AdminWeddingStory[];
  featuredMedia: AdminFeaturedMedia[];
  popularSearchCards: AdminPopularSearchCard[];
  blogPosts: AdminBlogPost[];
  vendors: AdminVendorListItem[];
  galleryCategories: GalleryCategory[];
}) {
  const [tab, setTab] = useState<Tab>("overview");

  const stats: Array<{ id: Tab; label: string; count: number; sub?: string }> = [
    { id: "real-weddings", label: "Real Weddings", count: weddingStories.length },
    { id: "gallery", label: "Gallery photos", count: featuredMedia.length },
    { id: "popular-searches", label: "Popular Searches", count: popularSearchCards.length },
    { id: "blog", label: "Blog posts", count: blogPosts.length, sub: `${blogPosts.filter((p) => !p.publishedAt).length} drafts` },
  ];

  return (
    <div>
      <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${
              tab === t.id ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setTab(s.id)}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-brand-primary hover:bg-surface-input"
              >
                <p className="text-xs font-semibold text-text-grey">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.count}</p>
                {s.sub && <p className="mt-0.5 text-[11px] text-text-grey">{s.sub}</p>}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-input text-text-grey">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18" />
              </svg>
            </div>
            <h3 className="text-[17px] font-bold">Coming in a future phase</h3>
            <p className="mt-2 max-w-[460px] text-[13px] leading-relaxed text-text-grey">
              Static pages, blog posts, guides, FAQs, and promotional banners haven&apos;t been built yet on the backend.
            </p>
            <div className="mt-6 grid max-w-[460px] grid-cols-3 gap-3">
              {STILL_STUB_ITEMS.map((item) => (
                <div key={item} className="rounded-md bg-surface-input px-3 py-2.5 text-center text-xs font-semibold text-text-grey">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "real-weddings" && (
        <div className="rounded-xl border border-border bg-white p-6">
          <TabHeader
            title="Real Wedding Stories"
            description="Homepage stories over real, public vendor albums — not independent editorial content."
            count={weddingStories.length}
          />
          <WeddingStoriesBoard initialStories={weddingStories} albums={albums} vendors={vendors} />
        </div>
      )}

      {tab === "gallery" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] text-text-grey">Categories and photos for the homepage&apos;s Gallery Inspiration section.</p>
            <span className="shrink-0 rounded-full bg-surface-input px-2.5 py-1 text-xs font-bold text-text-dark">
              {featuredMedia.length} featured
            </span>
          </div>
          <GalleryInspirationSection
            initialGalleryCategories={galleryCategories}
            initialFeatured={featuredMedia}
            approvedMedia={approvedMedia}
            vendors={vendors}
          />
        </div>
      )}

      {tab === "popular-searches" && (
        <div className="rounded-xl border border-border bg-white p-6">
          <TabHeader
            title="Popular Searches"
            description="Standalone editorial cards (title, location, price, image, search link) shown on the homepage — not curated from any other real entity."
            count={popularSearchCards.length}
          />
          <PopularSearchCardsBoard initialCards={popularSearchCards} />
        </div>
      )}

      {tab === "blog" && (
        <div className="rounded-xl border border-border bg-white p-6">
          <TabHeader
            title="Blog"
            description="Real, admin-authored articles (Markdown body) backing the public /blog list, /blog/[slug] detail pages, and the homepage's featured teaser section."
            count={blogPosts.length}
          />
          <BlogPostsBoard initialPosts={blogPosts} />
        </div>
      )}
    </div>
  );
}
