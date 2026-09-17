import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getOptionalSession } from "@/lib/auth/dal";
import { listCommunityTags } from "@/lib/api/community";
import { listFeaturedListings } from "@/lib/api/catalog";
import { ComposerBar } from "./ComposerBar";
import { CommunityAdSlot } from "./CommunityAdSlot";
import { CommunityFeed, CommunityFeedSkeleton } from "./CommunityFeed";

export const metadata: Metadata = {
  title: "Community",
};

interface CommunityPageProps {
  searchParams: Promise<{ tag?: string; sort?: string }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const { tag, sort: sortParam } = await searchParams;
  // "Latest" is the mockup's only sort pill — chronological (sort=new) is
  // the feed's default; "hot" (vote-ranked) stays reachable via ?sort=hot
  // for a future top/trending pill without a schema/query change.
  const sort: "hot" | "new" = sortParam === "hot" ? "hot" : "new";

  const [{ data: tags }, session, { data: adListings }] = await Promise.all([
    listCommunityTags(),
    getOptionalSession(),
    listFeaturedListings("COMMUNITY", 4).catch(() => ({ data: [] })),
  ]);
  const questionsTagId = tags.find((t) => t.slug === "questions")?.id;
  const leftAds = adListings.slice(0, 2);
  const rightAds = adListings.slice(2, 4);

  return (
    <>
      <PublicTopbar activeHref="/community" />

      {/* Hero banner — full-bleed photographic background with a dark
          vignette for legibility, same proven pattern as
          app/(public)/real-weddings/RealWeddingsView.tsx's hero, scaled
          down to this page's more content-dense layout. */}
      <section className="relative overflow-hidden py-10 sm:py-14 text-white">
        <div className="absolute inset-0 z-0">
          <Image src="/images/real-weddings-hero.jpg" alt="" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1160px] px-6 text-center sm:px-10">
          <span className="mb-3 inline-block rounded-full border border-white/25 bg-white/15 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white backdrop-blur-md">
            Community
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl">
            Real People. Real Weddings.
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-[13px] text-white/90 sm:text-sm">
            Ask questions, share experiences, get advice and be part of a community that celebrates every kalyanam.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1160px] grid-cols-[220px_minmax(0,720px)_220px] justify-center gap-6 px-10 py-7 max-[1200px]:grid-cols-1 max-[1200px]:px-4">
        <aside className="max-[1200px]:hidden">
          <CommunityAdSlot listings={leftAds} />
        </aside>

        <main>
          <ComposerBar isAuthenticated={session !== null} questionsTagId={questionsTagId} />

          <div className="mb-5.5 flex flex-wrap gap-2">
            <Link
              href={`/community?sort=${sort}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold no-underline ${
                !tag ? "bg-brand-primary text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
              }`}
            >
              Latest
            </Link>
            {tags.map((t) => (
              <Link
                key={t.id}
                href={`/community?sort=${sort}&tag=${t.slug}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold no-underline ${
                  tag === t.slug ? "bg-brand-primary text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>

          <Suspense key={`${sort}-${tag ?? "all"}`} fallback={<CommunityFeedSkeleton />}>
            <CommunityFeed sort={sort} tagSlug={tag} tags={tags} isAuthenticated={session !== null} />
          </Suspense>
        </main>

        <aside className="max-[1200px]:hidden">
          <CommunityAdSlot listings={rightAds} />
        </aside>
      </div>
      <PublicFooter />
    </>
  );
}
