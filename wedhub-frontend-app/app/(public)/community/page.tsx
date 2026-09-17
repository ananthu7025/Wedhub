import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getOptionalSession } from "@/lib/auth/dal";
import { listCommunityTags } from "@/lib/api/community";
import { ComposerBar } from "./ComposerBar";
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

  const [{ data: tags }, session] = await Promise.all([listCommunityTags(), getOptionalSession()]);
  const questionsTagId = tags.find((t) => t.slug === "questions")?.id;

  return (
    <>
      <PublicTopbar activeHref="/community" />
      <div className="mx-auto max-w-[720px] px-10 py-7 max-[900px]:px-4">
        {/* Hero banner — matches the approved mockup's soft-pink community banner. */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-crimson-10 bg-gradient-to-r from-crimson-10 via-white to-crimson-10 px-6 py-5">
          <div>
            <span className="mb-1 inline-block text-[11px] font-bold uppercase tracking-wide text-brand-primary">Community</span>
            <h1 className="mb-1 text-xl font-bold text-text-dark">Real People. Real Weddings.</h1>
            <p className="text-[13px] text-text-grey">
              Ask questions, share experiences, get advice and be part of a community that celebrates every kalyanam.
            </p>
          </div>
          <span className="text-3xl" aria-hidden>
            💍
          </span>
        </div>

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
      </div>
      <PublicFooter />
    </>
  );
}
