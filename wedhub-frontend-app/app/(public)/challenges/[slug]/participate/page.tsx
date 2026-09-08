import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getChallengeBySlug } from "@/lib/api/challenges";
import { getMyVendor, listLocationsSelf } from "@/lib/api/vendor-self";
import { ApiRequestError } from "@/lib/api/types";
import { getOptionalSession } from "@/lib/auth/dal";
import { ParticipateForm } from "./ParticipateForm";
import type { Challenge } from "@/lib/api/challenges.types";

interface ParticipatePageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Participate",
  robots: { index: false, follow: false },
};

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

export default async function ParticipatePage({ params }: ParticipatePageProps) {
  const { slug } = await params;
  const challenge = await loadChallenge(slug);
  const session = await getOptionalSession();

  if (challenge.status !== "LIVE") {
    return (
      <>
        <PublicTopbar />
        <div className="mx-auto max-w-[560px] px-6 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold">
            {challenge.status === "UPCOMING" ? "This challenge hasn't started yet" : "This challenge is no longer accepting entries"}
          </h1>
          <Link href={`/challenges/${challenge.slug}`} className="text-sm font-bold text-brand-primary no-underline hover:underline">
            ← Back to {challenge.title}
          </Link>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <PublicTopbar />
        <div className="mx-auto max-w-[560px] px-6 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold">Log in to participate</h1>
          <p className="mb-6 text-sm text-text-grey">You&apos;ll need an account to submit your work to {challenge.title}.</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/challenges/${slug}/participate`)}`}
            className="inline-block rounded-full bg-brand-primary px-6 py-3 text-sm font-bold text-white no-underline hover:opacity-90"
          >
            Log in
          </Link>
        </div>
        <PublicFooter />
      </>
    );
  }

  let vendorState: { kind: "eligible" } | { kind: "wrong_category"; categoryName: string } | { kind: "no_vendor" };
  try {
    const { data: vendor } = await getMyVendor();
    const inCategory = vendor.categories.some((c) => c.categoryId === challenge.categoryId);
    vendorState = inCategory ? { kind: "eligible" } : { kind: "wrong_category", categoryName: challenge.category.name };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      vendorState = { kind: "no_vendor" };
    } else {
      throw error;
    }
  }

  if (vendorState.kind === "wrong_category") {
    return (
      <>
        <PublicTopbar />
        <div className="mx-auto max-w-[560px] px-6 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold">This challenge is for {vendorState.categoryName} vendors</h1>
          <p className="mb-6 text-sm text-text-grey">Your vendor profile isn&apos;t in this category, so you can&apos;t enter this particular challenge.</p>
          <Link href="/gallery" className="text-sm font-bold text-brand-primary no-underline hover:underline">
            Explore other challenges →
          </Link>
        </div>
        <PublicFooter />
      </>
    );
  }

  const cities = vendorState.kind === "no_vendor" ? (await listLocationsSelf("CITY")).data : [];

  return (
    <>
      <PublicTopbar />
      <div className="mx-auto max-w-[600px] px-6 py-8 max-[600px]:px-4">
        <Link href={`/challenges/${challenge.slug}`} className="mb-4 inline-block text-sm text-text-grey no-underline hover:underline">
          ← {challenge.title}
        </Link>
        <h1 className="mb-1 text-xl font-bold">Participate in {challenge.title}</h1>
        <p className="mb-6 text-sm text-text-grey">Upload your best work and join the challenge.</p>
        <ParticipateForm
          challengeSlug={challenge.slug}
          needsVendorBootstrap={vendorState.kind === "no_vendor"}
          cities={cities}
        />
      </div>
      <PublicFooter />
    </>
  );
}
