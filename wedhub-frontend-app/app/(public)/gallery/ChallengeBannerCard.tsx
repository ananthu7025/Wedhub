"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Challenge } from "@/lib/api/challenges.types";

const STATUS_LABEL: Record<Challenge["status"], string> = {
  DRAFT: "",
  UPCOMING: "Starting soon",
  LIVE: "Entries Open",
  VOTING: "Voting Open",
  COMPLETED: "",
  ARCHIVED: "",
};

/**
 * Renders nothing when no active challenge exists for the browsed gallery
 * category — self-contained so GalleryPageView's existing layout is
 * completely unchanged on categories with no linked challenge.
 */
export function ChallengeBannerCard({ challenge }: { challenge: Challenge }) {
  const [daysRemaining] = useState(() =>
    Math.max(
      0,
      Math.ceil(
        (new Date(challenge.status === "VOTING" ? challenge.votingEndDate : challenge.endDate).getTime() - Date.now()) / 86_400_000,
      ),
    ),
  );

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface-input shadow-sm">
      <div className="relative h-40 w-full max-[600px]:h-32">
        {challenge.bannerImage && <Image src={challenge.bannerImage} alt={challenge.title} fill className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6 text-white max-[600px]:p-4">
          <span className="w-fit rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur">
            {STATUS_LABEL[challenge.status]}
          </span>
          <h2 className="text-lg font-bold max-[600px]:text-base">{challenge.title}</h2>
          <p className="text-xs text-white/80">
            {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left · {challenge.category.name}
          </p>
          <div className="mt-1 flex gap-2">
            {challenge.status === "LIVE" && (
              <Link
                href={`/challenges/${challenge.slug}/participate`}
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-text-dark no-underline hover:bg-white/90"
              >
                Participate
              </Link>
            )}
            <Link
              href={`/challenges/${challenge.slug}`}
              className="rounded-full border border-white/50 px-3.5 py-1.5 text-xs font-bold text-white no-underline hover:bg-white/10"
            >
              View Challenge
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
