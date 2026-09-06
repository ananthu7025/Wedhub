import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface VendorListingCardProps {
  status: string;
  verificationLevel: string;
  slug?: string;
  rejectionReason?: string | null;
}

export function VendorListingCard({
  status,
  verificationLevel,
  slug,
  rejectionReason,
}: VendorListingCardProps) {
  const isLive = status === "APPROVED";
  const isDraft = status === "DRAFT";
  const isPending = status === "PENDING_VERIFICATION";
  const isRejected = status === "REJECTED";

  let statusBadgeVariant: "green" | "amber" | "grey" | "red" = "grey";
  let statusDisplay = status.replace(/_/g, " ");

  if (isLive) {
    statusBadgeVariant = "green";
    statusDisplay = "LIVE";
  } else if (isPending) {
    statusBadgeVariant = "amber";
    statusDisplay = "PENDING REVIEW";
  } else if (isRejected) {
    statusBadgeVariant = "red";
    statusDisplay = "CHANGES REQUESTED";
  } else if (isDraft) {
    statusBadgeVariant = "grey";
    statusDisplay = "DRAFT";
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-input text-text-dark font-bold text-xs">
            🏢
          </span>
          <h2 className="text-sm sm:text-base font-bold text-text-dark">Your Listing</h2>
          <Badge variant={statusBadgeVariant}>{statusDisplay}</Badge>
          {verificationLevel && verificationLevel !== "UNVERIFIED" && (
            <Badge variant="blue">{verificationLevel.replace(/_/g, " ")}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/vendor/profile"
            className="rounded-lg border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-text-dark shadow-xs transition-colors hover:bg-surface-input"
          >
            Edit Listing
          </Link>
          {slug && (
            <Link
              href={`/vendors/${slug}`}
              target="_blank"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-xs transition-colors ${
                isLive
                  ? "bg-brand-primary text-white hover:bg-brand-primary-hover"
                  : "bg-surface-input text-text-dark hover:bg-neutral-grey-20"
              }`}
            >
              {isLive ? "View Public Profile ↗" : "Preview Profile ↗"}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3">
        {isDraft && (
          <p className="text-xs text-text-grey">
            Your listing isn&apos;t publicly discoverable yet. Complete the required setup and submit it for review to appear in couple searches.
          </p>
        )}
        {isPending && (
          <p className="text-xs text-amber-70">
            Your listing is currently under review by our curation team. You will be notified once it is approved and live.
          </p>
        )}
        {isLive && (
          <p className="text-xs text-emerald-70 font-medium">
            Your listing is live and discoverable to couples searching for wedding vendors in your area.
          </p>
        )}
        {isRejected && rejectionReason && (
          <div className="mt-2 rounded-xl border border-red-20 bg-red-10/50 p-3 text-xs text-red-70">
            <span className="font-bold">Review Feedback:</span> {rejectionReason}
          </div>
        )}
      </div>
    </div>
  );
}
