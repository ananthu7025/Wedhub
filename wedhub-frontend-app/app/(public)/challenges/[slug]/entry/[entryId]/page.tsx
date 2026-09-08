import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { JsonLd } from "@/components/shared/JsonLd";
import { ChallengeVoteButton } from "@/components/shared/ChallengeVoteButton";
import { getChallengeBySlug, getChallengeEntryById } from "@/lib/api/challenges";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ApiRequestError } from "@/lib/api/types";
import { getOptionalSession } from "@/lib/auth/dal";
import { breadcrumbListJsonLd } from "@/lib/seo/json-ld";
import { BRAND_NAME } from "@/lib/seo/site";

interface EntryPageProps {
  params: Promise<{ slug: string; entryId: string }>;
}

export async function generateMetadata({ params }: EntryPageProps): Promise<Metadata> {
  const { slug, entryId } = await params;
  try {
    const [{ data: challenge }, { data: entry }] = await Promise.all([
      getChallengeBySlug(slug),
      getChallengeEntryById(slug, entryId),
    ]);
    const canonicalPath = `/challenges/${slug}/entry/${entryId}`;
    const imageUrl = getPublicMediaUrl(entry.image.optimizedObjectKey ?? entry.image.originalObjectKey);
    const title = `${entry.title} by ${entry.vendor.businessName} — ${challenge.title}`;
    const description = `Vote for this entry on ${BRAND_NAME}`;

    return {
      title,
      description,
      alternates: { canonical: canonicalPath },
      openGraph: { title, description, url: canonicalPath, images: [{ url: imageUrl }] },
      twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Challenge Entry" };
  }
}

async function loadEntryPageData(slug: string, entryId: string) {
  try {
    const [challengeResult, entryResult, session] = await Promise.all([
      getChallengeBySlug(slug),
      getChallengeEntryById(slug, entryId),
      getOptionalSession(),
    ]);
    return {
      challenge: challengeResult.data,
      entry: entryResult.data,
      hasVotedByMe: entryResult.meta?.hasVotedByMe ?? false,
      isAuthenticated: session !== null,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export default async function ChallengeEntryPage({ params }: EntryPageProps) {
  const { slug, entryId } = await params;
  const { challenge, entry, hasVotedByMe, isAuthenticated } = await loadEntryPageData(slug, entryId);

  const imageUrl = getPublicMediaUrl(entry.image.optimizedObjectKey ?? entry.image.originalObjectKey);
  const votingOpen = challenge.status === "VOTING";

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: challenge.title, path: `/challenges/${challenge.slug}` },
    { name: entry.title, path: `/challenges/${challenge.slug}/entry/${entry.id}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems)} />
      <PublicTopbar />

      <div className="mx-auto max-w-[600px] px-6 py-8 max-[600px]:px-4">
        <Link href={`/challenges/${challenge.slug}`} className="mb-4 inline-block text-sm text-text-grey no-underline hover:underline">
          ← {challenge.title}
        </Link>

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-surface-input">
          <Image src={imageUrl} alt={entry.title} fill className="object-cover" priority />
        </div>

        <div className="mt-4">
          <h1 className="text-xl font-bold text-text-dark">{entry.title}</h1>
          <p className="text-sm text-text-grey">
            by {entry.vendor.businessName}
            {entry.location && <> · {entry.location}</>}
          </p>
          {entry.description && <p className="mt-3 text-sm leading-relaxed text-text-body">{entry.description}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ChallengeVoteButton
              challengeSlug={challenge.slug}
              entryId={entry.id}
              initialVoteCount={entry.voteCount}
              initialHasVoted={hasVotedByMe}
              isAuthenticated={isAuthenticated}
              votingOpen={votingOpen}
            />
            <Link
              href={`/vendors/${entry.vendor.slug}`}
              className="rounded-full border border-border px-4 py-2 text-xs font-bold text-text-body no-underline hover:bg-surface-input"
            >
              View Artist Profile
            </Link>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <Link href="/gallery" className="text-sm font-bold text-brand-primary no-underline hover:underline">
              Explore more Mehndi designs →
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
