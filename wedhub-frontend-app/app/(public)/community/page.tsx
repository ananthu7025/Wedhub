import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getOptionalSession } from "@/lib/auth/dal";
import { listCommunityTags } from "@/lib/api/community";
import { CommunityFeed, CommunityFeedSkeleton } from "./CommunityFeed";

export const metadata: Metadata = {
  title: "Community",
};

interface CommunityPageProps {
  searchParams: Promise<{ tag?: string; sort?: string }>;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const { tag, sort: sortParam } = await searchParams;
  const sort: "hot" | "new" = sortParam === "new" ? "new" : "hot";

  const [{ data: tags }, session] = await Promise.all([listCommunityTags(), getOptionalSession()]);

  return (
    <>
      <PublicTopbar activeHref="/community" />
      <div className="mx-auto max-w-[720px] px-10 py-7 max-[900px]:px-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Community</h1>
            <p className="text-sm text-text-grey">Real questions and stories from couples planning their wedding</p>
          </div>
          {session !== null && (
            <Link
              href="/community/new"
              className="rounded-md bg-brand-primary px-4 py-2.5 text-[13px] font-bold text-white no-underline shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
            >
              + New post
            </Link>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["hot", "new"] as const).map((option) => (
            <Link
              key={option}
              href={`/community?sort=${option}${tag ? `&tag=${tag}` : ""}`}
              className={`rounded-full px-4 py-2 text-[13px] font-bold no-underline ${
                sort === option ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
              }`}
            >
              {option === "hot" ? "Hot" : "New"}
            </Link>
          ))}
        </div>

        <div className="mb-5.5 flex flex-wrap gap-2">
          <Link
            href={`/community?sort=${sort}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold no-underline ${
              !tag ? "bg-crimson-10 text-crimson-70" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            All topics
          </Link>
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/community?sort=${sort}&tag=${t.slug}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold no-underline ${
                tag === t.slug ? "bg-crimson-10 text-crimson-70" : "border border-border bg-white text-text-body hover:bg-surface-input"
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
