import { listCommunityFeed } from "@/lib/api/community";
import type { CommunityTag } from "@/lib/api/community.types";
import { CommunityFeedList } from "./CommunityFeedList";

/**
 * Async Server Component, streamed independently via the parent page's
 * <Suspense> boundary — matches app/(public)/page.tsx's per-section
 * streaming pattern, so the page shell (header, sort/tag pills) renders
 * immediately while the feed query itself resolves. Voting/interaction is
 * handled by the CommunityFeedList Client Component this renders into.
 */
export async function CommunityFeed({
  sort,
  tagSlug,
  tags,
  isAuthenticated,
}: {
  sort: "hot" | "new";
  tagSlug: string | undefined;
  tags: CommunityTag[];
  isAuthenticated: boolean;
}) {
  const tagId = tagSlug ? tags.find((t) => t.slug === tagSlug)?.id : undefined;
  const { data: posts } = await listCommunityFeed({ sort, tagId, page: 1, limit: 20 });

  return <CommunityFeedList initialPosts={posts} isAuthenticated={isAuthenticated} />;
}

export function CommunityFeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[104px] animate-pulse rounded-xl border border-border bg-surface-input" />
      ))}
    </div>
  );
}
