import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { JsonLd } from "@/components/shared/JsonLd";
import { ChallengeEntryCard } from "@/components/shared/ChallengeEntryCard";
import { getChallengeBySlug, getChallengeEntries } from "@/lib/api/challenges";
import { ApiRequestError } from "@/lib/api/types";
import { getOptionalSession } from "@/lib/auth/dal";
import { breadcrumbListJsonLd } from "@/lib/seo/json-ld";
import { ChallengeAnalytics } from "./ChallengeAnalytics";
import { ChallengeCountdown } from "./ChallengeCountdown";
import type { Challenge } from "@/lib/api/challenges.types";

interface ChallengePageProps {
  params: Promise<{ slug: string }>;
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

export async function generateMetadata({ params }: ChallengePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const challenge = await loadChallenge(slug);
    const canonicalPath = `/challenges/${challenge.slug}`;
    return {
      title: challenge.title,
      description: challenge.description ?? undefined,
      alternates: { canonical: canonicalPath },
      openGraph: {
        title: challenge.title,
        description: challenge.description ?? undefined,
        url: canonicalPath,
        images: challenge.bannerImage ? [{ url: challenge.bannerImage }] : undefined,
      },
      robots: challenge.status === "DRAFT" ? { index: false, follow: false } : { index: true, follow: true },
    };
  } catch {
    return { title: "Challenge" };
  }
}

const STATUS_LABEL: Record<Challenge["status"], string> = {
  DRAFT: "Coming soon",
  UPCOMING: "Starting soon",
  LIVE: "Entries Open",
  VOTING: "Voting Open",
  COMPLETED: "Challenge Completed",
  ARCHIVED: "Challenge Completed",
};

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { slug } = await params;
  const challenge = await loadChallenge(slug);
  if (challenge.status === "DRAFT") {
    notFound();
  }

  const [entriesResult, session] = await Promise.all([
    getChallengeEntries(slug, { page: 1, limit: 12, sort: "votes" }),
    getOptionalSession(),
  ]);
  const entries = entriesResult.data;
  const votedEntryIds = new Set(entriesResult.meta?.myVotedEntryIds ?? []);
  const totalEntries = entriesResult.meta?.total ?? entries.length;
  const totalVotes = entries.reduce((sum, entry) => sum + entry.voteCount, 0);
  const votingOpen = challenge.status === "VOTING";
  const isAuthenticated = session !== null;

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Gallery", path: "/gallery" },
    { name: challenge.title, path: `/challenges/${challenge.slug}` },
  ];

  return (
    <>
      <ChallengeAnalytics challengeId={challenge.id} categorySlug={challenge.category.slug} />
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems)} />
      <PublicTopbar />

      <div className="relative h-64 bg-surface-input max-[900px]:h-44">
        {challenge.bannerImage && <Image src={challenge.bannerImage} alt={challenge.title} fill className="object-cover" priority />}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 px-4 text-center text-white">
          <span className="mb-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">
            {STATUS_LABEL[challenge.status]}
          </span>
          <h1 className="text-2xl font-bold max-[600px]:text-xl">{challenge.title}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] px-6 py-8 max-[600px]:px-4">
        {challenge.description && <p className="mb-6 text-sm leading-relaxed text-text-body">{challenge.description}</p>}

        <div className="mb-8 grid grid-cols-4 gap-3 rounded-xl border border-border bg-white p-5 max-[600px]:grid-cols-2 max-[600px]:gap-5">
          {(challenge.status === "LIVE" || challenge.status === "UPCOMING") && (
            <ChallengeCountdown
              targetDate={challenge.status === "UPCOMING" ? challenge.startDate : challenge.endDate}
              label={challenge.status === "UPCOMING" ? "Days to start" : "Days left to enter"}
            />
          )}
          {challenge.status === "VOTING" && <ChallengeCountdown targetDate={challenge.votingEndDate} label="Days left to vote" />}
          <div className="text-center">
            <p className="text-2xl font-bold text-text-dark">{totalEntries}</p>
            <p className="text-xs text-text-grey">Participating artists</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-dark">{totalVotes.toLocaleString("en-IN")}</p>
            <p className="text-xs text-text-grey">Total votes</p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {challenge.status === "LIVE" && (
            <Link
              href={`/challenges/${challenge.slug}/participate`}
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white no-underline hover:opacity-90"
            >
              Participate in Challenge
            </Link>
          )}
          <Link
            href={`/challenges/${challenge.slug}/rankings`}
            className="rounded-full border border-border bg-white px-5 py-3 text-sm font-bold text-text-dark no-underline hover:bg-surface-input"
          >
            View Rankings
          </Link>
        </div>

        {(challenge.prizeTitle || challenge.prizeDescription) && (
          <div className="mb-8 rounded-xl border border-border bg-surface-input p-5">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-text-grey">Prize</h2>
            <p className="text-lg font-bold text-text-dark">{challenge.prizeTitle ?? "Special Winner Prize"}</p>
            {challenge.prizeDescription && <p className="mt-1 text-sm text-text-body">{challenge.prizeDescription}</p>}
            {challenge.prizeValue && <p className="mt-1 text-sm font-bold text-brand-primary">{challenge.prizeValue}</p>}
            {!challenge.prizeTitle && !challenge.prizeDescription && (
              <p className="mt-1 text-sm text-text-grey">Revealing soon.</p>
            )}
            {challenge.sponsorName && (
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                {challenge.sponsorLogo && (
                  <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white">
                    <Image src={challenge.sponsorLogo} alt={challenge.sponsorName} fill className="object-contain" />
                  </div>
                )}
                <p className="text-xs text-text-grey">
                  Prize powered by{" "}
                  {challenge.sponsorUrl ? (
                    <a href={challenge.sponsorUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-text-dark">
                      {challenge.sponsorName}
                    </a>
                  ) : (
                    <span className="font-bold text-text-dark">{challenge.sponsorName}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {challenge.status === "COMPLETED" && challenge.winnerEntry && (
          <div className="mb-8 rounded-xl border-2 border-amber-70 bg-amber-10 p-5 text-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-70">🏆 Challenge Completed — Winner</p>
            <p className="text-lg font-bold text-text-dark">{challenge.winnerEntry.vendor.businessName}</p>
            <p className="text-sm text-text-body">{challenge.winnerEntry.title}</p>
            <Link
              href={`/vendors/${challenge.winnerEntry.vendor.slug}`}
              className="mt-2 inline-block text-sm font-bold text-brand-primary no-underline hover:underline"
            >
              View Vendor Profile
            </Link>
          </div>
        )}

        <h2 className="mb-4 text-lg font-bold">Entries</h2>
        {entries.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-input p-8 text-center text-sm text-text-grey">
            No entries have been approved yet — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
            {entries.map((entry) => (
              <ChallengeEntryCard
                key={entry.id}
                challengeSlug={challenge.slug}
                entry={entry}
                hasVotedByMe={votedEntryIds.has(entry.id)}
                isAuthenticated={isAuthenticated}
                votingOpen={votingOpen}
              />
            ))}
          </div>
        )}
      </div>
      <PublicFooter />
    </>
  );
}
