import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  listAdminApprovedMedia,
  listAdminBlogPosts,
  listAdminCategories,
  listAdminFeaturedMedia,
  listAdminPopularSearchCards,
  listAdminPublicAlbums,
  listAdminVendors,
  listAdminWeddingStories,
} from "@/lib/api/admin";
import { listAdminChallengeEntries, listAdminChallenges } from "@/lib/api/admin-challenges";
import { listGalleryCategories } from "@/lib/api/catalog";
import { CmsTabs } from "./CmsTabs";
import type { Challenge, ChallengeEntry } from "@/lib/api/challenges.types";
import type { Category } from "@/lib/api/vendors.types";

export const metadata: Metadata = {
  title: "CMS",
};

/**
 * CMS (Frontend Arch Phase 10, extended Frontend Arch Phase 17,
 * 2026-09-04), matching wedhub-frontend/admin/cms.html. Two of the
 * mockup's stub sections (Real Wedding Stories, Gallery Inspiration) are
 * now real — both curate real vendor Album/Media data rather than being
 * independent editorial content, per user decision. Popular Searches is
 * also now real, but standalone — no existing entity to curate over, so
 * it's a genuinely new, fully admin-authored content model with its own
 * image (POPULAR_SEARCH_IMAGE upload pipeline, mirroring Category.imageUrl's
 * precedent) rather than a reference to real vendor data. Blog is now
 * real too (added 2026-09-04, closing out backend Arch Phase 17) — same
 * standalone shape as Popular Searches, with its own BLOG_COVER_IMAGE
 * upload pipeline and a Markdown body. Pages, Guides, FAQs, and Banners
 * remain genuinely unbuilt (backend Arch Phase 17 scope not yet started
 * for those) — kept as an explicit "not yet" placeholder rather than
 * removed, so the admin nav structure and this page's own honesty about
 * what's real stay intact.
 *
 * Layout (2026-09-07): rearranged from one long stacked scroll into
 * CmsTabs' tabbed Overview/Real Weddings/Gallery/Popular Searches/Blog
 * navigation, inspired by a reference admin dashboard's tab+stat-card
 * structure — same boards, same data, no content added or removed.
 */

export default async function AdminCmsPage() {
  await requireAdmin();

  const [
    { data: albums },
    { data: approvedMedia },
    { data: weddingStories },
    { data: featuredMedia },
    { data: popularSearchCards },
    { data: blogPosts },
    { data: vendors },
    { data: galleryCategories },
    challenges,
    categories,
    challengeEntries,
  ] = await Promise.all([
    listAdminPublicAlbums(),
    listAdminApprovedMedia(),
    listAdminWeddingStories(),
    listAdminFeaturedMedia(),
    listAdminPopularSearchCards(),
    listAdminBlogPosts(),
    listAdminVendors({ status: "APPROVED", limit: 100 }),
    listGalleryCategories(),
    // Challenges is a new, still-settling tab — isolate its fetches with a
    // fallback so a transient/future issue here (e.g. a validation error)
    // degrades to an empty Challenges tab instead of 500ing the entire CMS
    // page, including Blog/Gallery/Popular Searches which have nothing to
    // do with it. A real bug caught live: listAdminChallengeEntries's
    // limit:200 exceeded the backend's max(100), and this Promise.all had
    // no error isolation, so the whole page 500'd.
    listAdminChallenges()
      .then((r) => r.data)
      .catch((): Challenge[] => []),
    listAdminCategories(false)
      .then((r) => r.data)
      .catch((): Category[] => []),
    listAdminChallengeEntries({ limit: 100 })
      .then((r) => r.data)
      .catch((): ChallengeEntry[] => []),
  ]);

  const entriesByChallenge: Record<string, typeof challengeEntries> = {};
  for (const entry of challengeEntries) {
    (entriesByChallenge[entry.challengeId] ??= []).push(entry);
  }

  return (
    <AdminShell activeHref="/admin/cms">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">CMS</h1>
        <p className="text-sm text-text-grey">Homepage content curation, the blog, plus pages, guides, FAQs & banners.</p>
      </div>

      <CmsTabs
        albums={albums}
        approvedMedia={approvedMedia}
        weddingStories={weddingStories}
        featuredMedia={featuredMedia}
        popularSearchCards={popularSearchCards}
        blogPosts={blogPosts}
        vendors={vendors}
        galleryCategories={galleryCategories}
        challenges={challenges}
        categories={categories}
        challengeEntries={challengeEntries}
        entriesByChallenge={entriesByChallenge}
      />
    </AdminShell>
  );
}
