import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getChallengeBySlug, getChallengeRankings } from "@/lib/api/challenges";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ApiRequestError } from "@/lib/api/types";
import type { Challenge } from "@/lib/api/challenges.types";

interface RankingsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function loadChallenge(slug: string): Promise<Challenge> {
  try {
    const { data } = await getChallengeBySlug(slug);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: RankingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const challenge = await loadChallenge(slug);
    const canonicalPath = `/challenges/${challenge.slug}/rankings`;
    return {
      title: `Rankings — ${challenge.title}`,
      alternates: { canonical: canonicalPath },
      openGraph: { title: `Rankings — ${challenge.title}`, url: canonicalPath },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Rankings" };
  }
}

const PAGE_SIZE = 50;

export default async function ChallengeRankingsPage({ params, searchParams }: RankingsPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const challenge = await loadChallenge(slug);
  const { data: entries, meta } = await getChallengeRankings(slug, { page, limit: PAGE_SIZE });
  const frozen = meta?.frozen ?? false;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <>
      <PublicTopbar />
      <div className="mx-auto max-w-[800px] px-6 py-8 max-[600px]:px-4">
        <Link href={`/challenges/${challenge.slug}`} className="mb-4 inline-block text-sm text-text-grey no-underline hover:underline">
          ← {challenge.title}
        </Link>
        <h1 className="mb-6 text-2xl font-bold">Rankings</h1>

        {frozen ? (
          <div className="rounded-xl border border-border bg-surface-input p-8 text-center">
            <p className="text-sm font-bold text-text-dark">Final voting in progress</p>
            <p className="mt-1 text-sm text-text-grey">Rankings are temporarily hidden until voting closes.</p>
          </div>
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-input p-8 text-center text-sm text-text-grey">
            No approved entries yet.
          </p>
        ) : (
          <ol className="space-y-2">
            {entries.map((entry, index) => {
              const rank = (page - 1) * PAGE_SIZE + index + 1;
              const isTop3 = rank <= 3;
              const imageKey = entry.image.optimizedObjectKey ?? entry.image.originalObjectKey;
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    isTop3 ? "border-amber-70 bg-amber-10" : "border-border bg-white"
                  }`}
                >
                  <span className="w-8 shrink-0 text-center text-sm font-bold text-text-grey">
                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                  </span>
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-input">
                    <Image src={getPublicMediaUrl(imageKey)} alt={entry.title} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-dark">{entry.vendor.businessName}</p>
                    {entry.location && <p className="text-xs text-text-grey">{entry.location}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-brand-primary">{entry.voteCount.toLocaleString("en-IN")} votes</p>
                    <div className="mt-1 flex gap-2 text-xs">
                      <Link href={`/challenges/${challenge.slug}/entry/${entry.id}`} className="text-text-body no-underline hover:underline">
                        View Entry
                      </Link>
                      <Link href={`/vendors/${entry.vendor.slug}`} className="text-text-body no-underline hover:underline">
                        View Artist
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {!frozen && totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/challenges/${challenge.slug}/rankings?page=${page - 1}`}
                className="rounded-md border border-border px-4 py-2 text-sm no-underline hover:bg-surface-input"
              >
                Previous
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-text-grey">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/challenges/${challenge.slug}/rankings?page=${page + 1}`}
                className="rounded-md border border-border px-4 py-2 text-sm no-underline hover:bg-surface-input"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
      <PublicFooter />
    </>
  );
}
