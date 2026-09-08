/**
 * Types for the reusable Challenge/Contest system (launch: 30-Day Mehndi
 * Challenge). Maps 1:1 to wedhub-backend's src/modules/challenges module —
 * kept as its own file (not folded into vendors.types.ts) since Challenge/
 * ChallengeEntry/ChallengeVote are a big enough surface to warrant one,
 * matching how account.types.ts is already split out for the couple-account
 * domain.
 */

export type ChallengeStatus = "DRAFT" | "UPCOMING" | "LIVE" | "VOTING" | "COMPLETED" | "ARCHIVED";
export type ChallengeEntryStatus = "PENDING" | "APPROVED" | "REJECTED" | "DISQUALIFIED";
export type ChallengeVoteScope = "PER_ENTRY" | "PER_CHALLENGE";

export interface ChallengeMediaRef {
  id: string;
  optimizedObjectKey: string | null;
  originalObjectKey: string;
}

export interface ChallengeWinnerEntry {
  id: string;
  title: string;
  vendor: { id: string; slug: string; businessName: string };
  image: ChallengeMediaRef;
}

export interface Challenge {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  galleryCategoryId: string | null;
  galleryCategory: { id: string; name: string; slug: string } | null;
  description: string | null;
  bannerImage: string | null;
  startDate: string;
  endDate: string;
  votingStartDate: string;
  votingEndDate: string;
  status: ChallengeStatus;
  voteScope: ChallengeVoteScope;
  hideLiveRankingsBeforeEndHours: number | null;
  allowMultipleEntriesPerVendor: boolean;
  maxEntries: number | null;
  prizeTitle: string | null;
  prizeDescription: string | null;
  prizeValue: string | null;
  sponsorName: string | null;
  sponsorLogo: string | null;
  sponsorUrl: string | null;
  winnerEntryId: string | null;
  winnerEntry: ChallengeWinnerEntry | null;
  rules: string | null;
  termsAndConditions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeEntryPhoto {
  sortOrder: number;
  media: ChallengeMediaRef;
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  vendorId: string;
  vendor: { id: string; slug: string; businessName: string };
  categoryId: string;
  category: { id: string; name: string; slug: string };
  title: string;
  description: string | null;
  imageMediaId: string;
  image: ChallengeMediaRef;
  additionalImages: ChallengeEntryPhoto[];
  location: string | null;
  status: ChallengeEntryStatus;
  voteCount: number;
  submittedAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeVoteResult {
  vote: { id: string; entryId: string; createdAt: string };
  voteCount: number;
}

export interface ChallengeEntryPhotoUploadRequest {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

export interface SubmitEntryResponse {
  entry: ChallengeEntry;
}

export interface CreateChallengeEntryBody {
  title: string;
  description?: string;
  imageMediaId: string;
  additionalImageMediaIds?: string[];
  location?: string;
  acceptedTerms: true;
  // Vendor-bootstrap fields — include only when the caller has no vendor
  // profile yet in the challenge's category (see participate/page.tsx).
  businessName?: string;
  shortDescription?: string;
  cityId?: string;
  startingPrice?: number;
  customQuoteAvailable?: boolean;
  contactPhone?: string;
  contactEmail?: string;
}
