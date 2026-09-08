import { z } from "zod";

const CHALLENGE_STATUSES = ["DRAFT", "UPCOMING", "LIVE", "VOTING", "COMPLETED", "ARCHIVED"] as const;
const VOTE_SCOPES = ["PER_ENTRY", "PER_CHALLENGE"] as const;
const ENTRY_MODERATION_REASON_MAX = 500;

const dateField = z.coerce.date();

export const createChallengeSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    categoryId: z.string().uuid(),
    galleryCategoryId: z.string().uuid().optional(),
    description: z.string().trim().max(5000).optional(),
    bannerImage: z.string().trim().url().optional(),
    startDate: dateField,
    endDate: dateField,
    votingStartDate: dateField,
    votingEndDate: dateField,
    voteScope: z.enum(VOTE_SCOPES).optional(),
    hideLiveRankingsBeforeEndHours: z.coerce.number().int().min(0).max(720).optional(),
    allowMultipleEntriesPerVendor: z.boolean().optional(),
    maxEntries: z.coerce.number().int().positive().optional(),
    prizeTitle: z.string().trim().max(200).optional(),
    prizeDescription: z.string().trim().max(2000).optional(),
    prizeValue: z.string().trim().max(200).optional(),
    sponsorName: z.string().trim().max(200).optional(),
    sponsorLogo: z.string().trim().url().optional(),
    sponsorUrl: z.string().trim().url().optional(),
    rules: z.string().trim().max(10000).optional(),
    termsAndConditions: z.string().trim().max(10000).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  })
  .refine((data) => data.votingEndDate > data.votingStartDate, {
    message: "votingEndDate must be after votingStartDate",
    path: ["votingEndDate"],
  })
  .refine((data) => data.votingStartDate >= data.startDate, {
    message: "votingStartDate cannot be before the challenge startDate",
    path: ["votingStartDate"],
  });

export type CreateChallengeBody = z.infer<typeof createChallengeSchema>;

export const updateChallengeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  galleryCategoryId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  bannerImage: z.string().trim().url().nullable().optional(),
  startDate: dateField.optional(),
  endDate: dateField.optional(),
  votingStartDate: dateField.optional(),
  votingEndDate: dateField.optional(),
  status: z.enum(CHALLENGE_STATUSES).optional(),
  voteScope: z.enum(VOTE_SCOPES).optional(),
  hideLiveRankingsBeforeEndHours: z.coerce.number().int().min(0).max(720).nullable().optional(),
  allowMultipleEntriesPerVendor: z.boolean().optional(),
  maxEntries: z.coerce.number().int().positive().nullable().optional(),
  prizeTitle: z.string().trim().max(200).nullable().optional(),
  prizeDescription: z.string().trim().max(2000).nullable().optional(),
  prizeValue: z.string().trim().max(200).nullable().optional(),
  sponsorName: z.string().trim().max(200).nullable().optional(),
  sponsorLogo: z.string().trim().url().nullable().optional(),
  sponsorUrl: z.string().trim().url().nullable().optional(),
  rules: z.string().trim().max(10000).nullable().optional(),
  termsAndConditions: z.string().trim().max(10000).nullable().optional(),
});

export type UpdateChallengeBody = z.infer<typeof updateChallengeSchema>;

export const listChallengesQuerySchema = z.object({
  status: z.enum(CHALLENGE_STATUSES).optional(),
});

export type ListChallengesQuery = z.infer<typeof listChallengesQuerySchema>;

// gallerySlug matches the /gallery page's ?category=<slug> param (a
// GalleryCategory.slug), categoryId is the real vendor-facing Category —
// callers use whichever they have on hand.
export const activeChallengeQuerySchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    gallerySlug: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.categoryId || data.gallerySlug, {
    message: "categoryId or gallerySlug is required",
  });

export type ActiveChallengeQuery = z.infer<typeof activeChallengeQuerySchema>;

export const listEntriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["votes", "recent"]).default("votes"),
});

export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;

export const rankingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type RankingsQuery = z.infer<typeof rankingsQuerySchema>;

export const setWinnerSchema = z.object({
  entryId: z.string().uuid(),
});

export type SetWinnerBody = z.infer<typeof setWinnerSchema>;

export const promoteToGallerySchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1),
  galleryCategoryId: z.string().uuid(),
});

export type PromoteToGalleryBody = z.infer<typeof promoteToGallerySchema>;

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_ADDITIONAL_ENTRY_PHOTOS = 5;

export const submitEntrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  imageMediaId: z.string().uuid(),
  additionalImageMediaIds: z.array(z.string().uuid()).max(MAX_ADDITIONAL_ENTRY_PHOTOS).optional(),
  location: z.string().trim().max(200).optional(),
  acceptedTerms: z.literal(true, { message: "You must accept the challenge terms to submit an entry" }),
  // Vendor-bootstrap fields (all optional — omitted entirely when the caller
  // already has a matching-category vendor profile).
  businessName: z.string().trim().min(1).max(150).optional(),
  shortDescription: z.string().trim().min(1).max(200).optional(),
  cityId: z.string().uuid().optional(),
  startingPrice: z.coerce.number().positive().optional(),
  customQuoteAvailable: z.boolean().optional(),
  contactPhone: z.string().trim().min(1).max(30).optional(),
  contactEmail: z.string().trim().email().optional(),
});

export type SubmitEntryBody = z.infer<typeof submitEntrySchema>;

export const createEntryPhotoUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_MIME_TYPES as [string, ...string[]]),
  fileSize: z.coerce.number().int().positive(),
});

export type CreateEntryPhotoUploadRequestBody = z.infer<typeof createEntryPhotoUploadRequestSchema>;

export const moderateEntrySchema = z.object({
  reason: z.string().trim().min(1).max(ENTRY_MODERATION_REASON_MAX).optional(),
});

export type ModerateEntryBody = z.infer<typeof moderateEntrySchema>;

export const listAdminEntriesQuerySchema = z.object({
  challengeId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "DISQUALIFIED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListAdminEntriesQuery = z.infer<typeof listAdminEntriesQuerySchema>;

export const participantsQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
});

export type ParticipantsQuery = z.infer<typeof participantsQuerySchema>;
