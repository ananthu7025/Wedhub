"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getMyChallengeEntry } from "@/lib/api/challenges-client";
import type { Challenge, ChallengeEntry } from "@/lib/api/challenges.types";

/**
 * Small, self-contained "Your Challenge Entry" card — only mounted by
 * dashboard/page.tsx when the vendor's primary category has an active
 * (LIVE or VOTING) challenge, so it never shows up for a vendor with nothing
 * relevant to see. Client component since it needs a per-challenge fetch the
 * server page shouldn't block on for every dashboard load.
 */
export function ChallengeEntryWidget({ challenge }: { challenge: Challenge }) {
  const [entry, setEntry] = useState<ChallengeEntry | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getMyChallengeEntry(challenge.slug).then((result) => {
      if (!cancelled && result.success) setEntry(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [challenge.slug]);

  if (entry === undefined) {
    return null; // still loading — avoid a layout flash for the common "no entry" case
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-sm font-bold text-text-dark">{challenge.title}</h3>
        <Badge variant="crimson">Challenge Live</Badge>
      </div>

      {!entry && (
        <div className="text-center">
          <p className="mb-3 text-xs text-text-grey">
            A {challenge.category.name} challenge is live — submit your entry.
          </p>
          <Link
            href={`/challenges/${challenge.slug}/participate`}
            className="inline-block rounded-full bg-brand-primary px-4 py-2 text-xs font-bold text-white no-underline hover:opacity-90"
          >
            Submit Entry
          </Link>
        </div>
      )}

      {entry?.status === "PENDING" && (
        <p className="text-xs text-text-grey">Your entry is awaiting review.</p>
      )}

      {entry?.status === "APPROVED" && (
        <div>
          <p className="text-2xl font-bold text-text-dark">{entry.voteCount.toLocaleString("en-IN")}</p>
          <p className="mb-3 text-xs text-text-grey">votes</p>
          <Link
            href={`/challenges/${challenge.slug}/entry/${entry.id}`}
            className="text-xs font-bold text-brand-primary no-underline hover:underline"
          >
            Share your entry and move up the rankings →
          </Link>
        </div>
      )}

      {entry?.status === "REJECTED" && (
        <div>
          <p className="text-xs font-bold text-red-70">Your entry was not approved</p>
          {entry.rejectionReason && <p className="mt-1 text-xs text-text-grey">{entry.rejectionReason}</p>}
        </div>
      )}

      {entry?.status === "DISQUALIFIED" && <p className="text-xs text-text-grey">Your entry was disqualified.</p>}
    </div>
  );
}
