import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listAdminApprovedMedia,
  listAdminFeaturedMedia,
  listAdminPublicAlbums,
  listAdminVendors,
  listAdminWeddingStories,
} from "@/lib/api/admin";
import { WeddingStoriesBoard } from "./WeddingStoriesBoard";
import { FeaturedMediaBoard } from "./FeaturedMediaBoard";

export const metadata: Metadata = {
  title: "CMS",
};

/**
 * CMS (Frontend Arch Phase 10, extended Frontend Arch Phase 17,
 * 2026-09-04), matching wedhub-frontend/admin/cms.html. Two of the
 * mockup's stub sections (Real Wedding Stories, Gallery Inspiration) are
 * now real — both curate real vendor Album/Media data rather than being
 * independent editorial content, per user decision. Pages, Blog, Guides,
 * FAQs, and Banners remain genuinely unbuilt (backend Arch Phase 17
 * scope not yet started for those) — kept as an explicit "not yet"
 * placeholder rather than removed, so the admin nav structure and this
 * page's own honesty about what's real stay intact.
 */

const STILL_STUB_ITEMS = ["Pages", "Blog", "Guides", "FAQs", "Banners"];

export default async function AdminCmsPage() {
  await requireAdmin();

  const [{ data: albums }, { data: approvedMedia }, { data: weddingStories }, { data: featuredMedia }, { data: vendors }] =
    await Promise.all([
      listAdminPublicAlbums(),
      listAdminApprovedMedia(),
      listAdminWeddingStories(),
      listAdminFeaturedMedia(),
      listAdminVendors({ status: "APPROVED", limit: 100 }),
    ]);

  return (
    <AdminShell activeHref="/admin/cms">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">CMS</h1>
        <p className="text-sm text-text-grey">Homepage content curation, plus pages, blog, guides, FAQs & banners.</p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-6">
        <h3 className="mb-1 text-base font-bold">Real Wedding Stories</h3>
        <p className="mb-4 text-[13px] text-text-grey">
          Homepage stories over real, public vendor albums — not independent editorial content.
        </p>
        <WeddingStoriesBoard initialStories={weddingStories} albums={albums} vendors={vendors} />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-6">
        <h3 className="mb-1 text-base font-bold">Gallery Inspiration</h3>
        <p className="mb-4 text-[13px] text-text-grey">
          Real, approved vendor portfolio photos featured on the homepage gallery.
        </p>
        <FeaturedMediaBoard initialFeatured={featuredMedia} approvedMedia={approvedMedia} vendors={vendors} />
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
    </AdminShell>
  );
}
