/**
 * Backend response shapes for the ₹49 Instant Wedding Website surface
 * (/wedding-websites/*, /wedding-website-media/*) — verified field-by-field
 * against wedhub-backend source and live curl during backend Arch Phase 26
 * (see ../docs/12-stage-wedding-website.md).
 *
 * Two distinct response shapes exist for the same underlying model:
 * - WeddingWebsiteDraft — the wide, owner-only shape (GET/PATCH /me/:id),
 *   includes ownerUserId/previewTokenHash/timestamps.
 * - WeddingWebsitePublicView — the narrow shape returned by BOTH the
 *   preview and published public reads (toPublicRenderView() on the
 *   backend) — no owner info, no payment info, no preview-token internals.
 *   The preview and published pages must render from this same shape.
 *
 * WeddingWebsiteMedia carries no precomputed `url` — resolve via
 * getPublicMediaUrl(objectKeyFor(media)) from lib/media/url.ts, same as
 * every other media type in this app. publish-order's `amount` is a plain
 * number (env-configured price), not a Prisma Decimal string.
 */

export type WeddingWebsiteTemplate = "ROYAL_WEDDING" | "MINIMAL_ELEGANT" | "TRADITIONAL_INDIAN";
export type WeddingWebsiteStatus = "DRAFT" | "PUBLISHED";
export type RsvpAttending = "YES" | "NO" | "MAYBE";
export type WeddingWebsiteMediaStatus = "PENDING" | "UPLOADING" | "PROCESSING" | "READY" | "INACTIVE" | "FAILED" | "DELETED";

export interface WeddingWebsiteMedia {
  id: string;
  originalObjectKey: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  status: WeddingWebsiteMediaStatus;
  sortOrder: number;
  createdAt: string;
}

export interface WeddingWebsiteEvent {
  id: string;
  weddingWebsiteId: string;
  name: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface WeddingWebsiteCoreFields {
  id: string;
  template: WeddingWebsiteTemplate;
  status: WeddingWebsiteStatus;
  slug: string | null;
  brideName: string;
  groomName: string;
  weddingDate: string | null;
  weddingTime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  googleMapsUrl: string | null;
  shortDescription: string | null;
  brideParents: string | null;
  groomParents: string | null;
  weddingHashtag: string | null;
  contactInfo: string | null;
  socialLinks: Record<string, string> | null;
  coupleStory: string | null;
  brideDescription: string | null;
  groomDescription: string | null;
  howWeMet: string | null;
  coverMedia: WeddingWebsiteMedia | null;
  couplePhotoMedia: WeddingWebsiteMedia | null;
  events: WeddingWebsiteEvent[];
  gallery: WeddingWebsiteMedia[];
}

// ---- GET /wedding-websites/preview/:token, GET /wedding-websites/published/:slug ----
// The narrow, render-only projection — no owner/payment fields exist on
// this shape at all (not just hidden), matching the backend's
// toPublicRenderView().
export type WeddingWebsitePublicView = WeddingWebsiteCoreFields;

// ---- GET/PATCH /wedding-websites/me, /me/:id ----
// The wide, owner-only shape — includes everything the public view has,
// plus ownership/preview/payment-adjacent internals the dashboard needs.
export interface WeddingWebsiteDraft extends WeddingWebsiteCoreFields {
  ownerUserId: string | null;
  ownerTelegramUserId: string | null;
  coverMediaId: string | null;
  couplePhotoMediaId: string | null;
  previewCreatedAt: string | null;
  previewExpiresAt: string | null;
  previewUsedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeddingWebsiteTemplateOption {
  id: WeddingWebsiteTemplate;
  name: string;
}

export interface WeddingWebsiteRsvp {
  id: string;
  weddingWebsiteId: string;
  name: string;
  attending: RsvpAttending;
  guestCount: number | null;
  message: string | null;
  createdAt: string;
}

export interface WeddingWebsitePublishedSlug {
  slug: string;
  updatedAt: string;
}

// ---- POST /wedding-websites/me ----
export interface CreateWeddingWebsiteBody {
  template?: WeddingWebsiteTemplate;
  brideName: string;
  groomName: string;
}

// ---- PATCH /wedding-websites/me/:id ----
export interface UpdateWeddingWebsiteBody {
  template?: WeddingWebsiteTemplate;
  brideName?: string;
  groomName?: string;
  weddingDate?: string;
  weddingTime?: string;
  venueName?: string;
  venueAddress?: string;
  googleMapsUrl?: string;
  shortDescription?: string;
  brideParents?: string;
  groomParents?: string;
  weddingHashtag?: string;
  contactInfo?: string;
  socialLinks?: Record<string, string>;
  coupleStory?: string;
  brideDescription?: string;
  groomDescription?: string;
  howWeMet?: string;
  coverMediaId?: string | null;
  couplePhotoMediaId?: string | null;
}

// ---- POST /wedding-websites/me/:id/events, PATCH .../me/events/:eventId ----
export interface CreateWeddingWebsiteEventBody {
  name: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
}

export interface UpdateWeddingWebsiteEventBody {
  name?: string;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  description?: string | null;
  sortOrder?: number;
}

// ---- POST /wedding-websites/published/:slug/rsvp ----
export interface SubmitRsvpBody {
  name: string;
  attending: RsvpAttending;
  guestCount?: number;
  message?: string;
}

// ---- POST /wedding-websites/me/:id/preview ----
export interface GeneratePreviewResult {
  previewToken: string;
  previewExpiresAt: string;
}

// ---- POST /wedding-websites/me/:id/publish-order ----
export interface CreatePublishOrderResult {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
}

// ---- POST /wedding-website-media/upload-requests ----
export interface WeddingWebsiteUploadRequestResult {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}
