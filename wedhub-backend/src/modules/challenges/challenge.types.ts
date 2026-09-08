export interface CreateChallengeInput {
  title: string;
  categoryId: string;
  galleryCategoryId: string | undefined;
  description: string | undefined;
  bannerImage: string | undefined;
  startDate: Date;
  endDate: Date;
  votingStartDate: Date;
  votingEndDate: Date;
  voteScope: "PER_ENTRY" | "PER_CHALLENGE" | undefined;
  hideLiveRankingsBeforeEndHours: number | undefined;
  allowMultipleEntriesPerVendor: boolean | undefined;
  maxEntries: number | undefined;
  prizeTitle: string | undefined;
  prizeDescription: string | undefined;
  prizeValue: string | undefined;
  sponsorName: string | undefined;
  sponsorLogo: string | undefined;
  sponsorUrl: string | undefined;
  rules: string | undefined;
  termsAndConditions: string | undefined;
}

export interface UpdateChallengeInput {
  title: string | undefined;
  categoryId: string | undefined;
  galleryCategoryId: string | null | undefined;
  description: string | null | undefined;
  bannerImage: string | null | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  votingStartDate: Date | undefined;
  votingEndDate: Date | undefined;
  status: "DRAFT" | "UPCOMING" | "LIVE" | "VOTING" | "COMPLETED" | "ARCHIVED" | undefined;
  voteScope: "PER_ENTRY" | "PER_CHALLENGE" | undefined;
  hideLiveRankingsBeforeEndHours: number | null | undefined;
  allowMultipleEntriesPerVendor: boolean | undefined;
  maxEntries: number | null | undefined;
  prizeTitle: string | null | undefined;
  prizeDescription: string | null | undefined;
  prizeValue: string | null | undefined;
  sponsorName: string | null | undefined;
  sponsorLogo: string | null | undefined;
  sponsorUrl: string | null | undefined;
  rules: string | null | undefined;
  termsAndConditions: string | null | undefined;
}

export interface SubmitEntryInput {
  title: string;
  description: string | undefined;
  imageMediaId: string;
  additionalImageMediaIds: string[] | undefined;
  location: string | undefined;
  acceptedTerms: boolean;
  // Vendor-bootstrap fields — only used when the caller has no vendor
  // profile yet in the challenge's category. See challenge-entry.vendor-bootstrap.ts.
  businessName: string | undefined;
  shortDescription: string | undefined;
  cityId: string | undefined;
  startingPrice: number | undefined;
  customQuoteAvailable: boolean | undefined;
  contactPhone: string | undefined;
  contactEmail: string | undefined;
}

export interface ModerateEntryInput {
  reason: string | undefined;
}
