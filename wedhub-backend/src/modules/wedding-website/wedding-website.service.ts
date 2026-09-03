import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { env } from "../../config/env";
import { createOrder } from "../../integrations/payment/razorpay.client";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import { generateOpaqueToken, hashToken } from "../../common/utils/token.util";
import * as weddingWebsiteRepository from "./wedding-website.repository";
import type {
  CreateWeddingWebsiteBody,
  CreateWeddingWebsiteEventBody,
  SubmitRsvpBody,
  UpdateWeddingWebsiteBody,
  UpdateWeddingWebsiteEventBody,
} from "./wedding-website.schema";

// Ownership is exactly-one-of ownerUserId / ownerTelegramUserId (see
// docs/12-stage-wedding-website.md's "Ownership" decision) — this throws
// NotFoundError rather than AuthorizationError for a draft owned by
// someone else, matching this codebase's existing convention of not
// revealing whether a resource exists to a caller who doesn't own it
// (same pattern as getOwnedVendorOrThrow / album.service.ts's ownership
// checks).
async function getOwnedDraftOrThrow(id: string, ownerUserId: string) {
  const draft = await weddingWebsiteRepository.findOwnedByUser(id, ownerUserId);
  if (!draft) {
    throw new NotFoundError("Wedding website not found");
  }
  return draft;
}

export function createDraft(ownerUserId: string, input: CreateWeddingWebsiteBody) {
  return weddingWebsiteRepository.createForUser(ownerUserId, input);
}

export function createDraftForTelegramUser(
  ownerTelegramUserId: string,
  input: { template: string; brideName: string; groomName: string },
) {
  return weddingWebsiteRepository.createForTelegramUser(ownerTelegramUserId, input);
}

export function listOwnDrafts(ownerUserId: string) {
  return weddingWebsiteRepository.listOwnedByUser(ownerUserId);
}

export async function getOwnDraft(id: string, ownerUserId: string) {
  return getOwnedDraftOrThrow(id, ownerUserId);
}

export async function updateDraft(id: string, ownerUserId: string, input: UpdateWeddingWebsiteBody) {
  await getOwnedDraftOrThrow(id, ownerUserId);
  return weddingWebsiteRepository.update(id, input);
}

// Business Rule 1: one free public preview per draft. Once previewUsedAt
// is set, this returns the SAME (now stale/expired-eventually) preview
// state rather than minting a new token — the caller (controller) checks
// previewUsedAt on the returned row to decide which message to show, per
// the feature spec's "already used" vs. "here's your preview" UX split.
export async function generatePreview(id: string, ownerUserId: string) {
  const draft = await getOwnedDraftOrThrow(id, ownerUserId);

  if (draft.previewUsedAt) {
    throw new ConflictError("Your free preview has already been used — publish your wedding website for ₹49 to get your permanent shareable link.");
  }

  const rawToken = generateOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.WEDDING_WEBSITE_PREVIEW_EXPIRY_MINUTES * 60 * 1000);

  await weddingWebsiteRepository.setPreview(id, {
    previewTokenHash: hashToken(rawToken),
    previewCreatedAt: now,
    previewExpiresAt: expiresAt,
  });

  return { previewToken: rawToken, previewExpiresAt: expiresAt };
}

// Business Rule 7/8: neither the preview nor the published read exposes
// owner identity, the preview-token hash, or any other internal-only
// field — only what WeddingWebsiteRenderer actually needs to render
// (Business Rule 12: same renderer, same shape, preview or published).
// Applied explicitly rather than relying on the repository's `include`
// alone, since Prisma always returns every scalar column on the base
// model regardless of `include` — a real gap caught during live
// verification of this exact endpoint (see docs/12-stage-wedding-
// website.md's progress notes).
function toPublicRenderView(website: NonNullable<Awaited<ReturnType<typeof weddingWebsiteRepository.findBySlug>>>) {
  return {
    id: website.id,
    template: website.template,
    status: website.status,
    slug: website.slug,
    brideName: website.brideName,
    groomName: website.groomName,
    weddingDate: website.weddingDate,
    weddingTime: website.weddingTime,
    venueName: website.venueName,
    venueAddress: website.venueAddress,
    googleMapsUrl: website.googleMapsUrl,
    shortDescription: website.shortDescription,
    brideParents: website.brideParents,
    groomParents: website.groomParents,
    weddingHashtag: website.weddingHashtag,
    contactInfo: website.contactInfo,
    socialLinks: website.socialLinks,
    coupleStory: website.coupleStory,
    brideDescription: website.brideDescription,
    groomDescription: website.groomDescription,
    howWeMet: website.howWeMet,
    coverMedia: website.coverMedia,
    couplePhotoMedia: website.couplePhotoMedia,
    events: website.events,
    gallery: website.gallery,
  };
}

// Public preview read — validates the hash + expiry, returns only
// render-necessary fields (Business Rule 7/8: not indexed, no owner/
// payment info). Distinguishes "expired" from "not found at all" so the
// controller can show the feature spec's specific expired-preview copy
// rather than a generic 404 — but never leaks the underlying website
// content either way once invalid.
export async function getPreviewByToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const draft = await weddingWebsiteRepository.findByPreviewTokenHash(tokenHash);

  if (!draft) {
    throw new NotFoundError("Preview not found");
  }
  if (draft.status === "PUBLISHED") {
    // The website has since been published — the preview token was
    // cleared on publish, so this branch is unreachable via a fresh
    // lookup, but guards defensively against a stale hash match.
    throw new NotFoundError("Preview not found");
  }
  if (!draft.previewExpiresAt || draft.previewExpiresAt < new Date()) {
    throw new ConflictError("Your preview has expired — publish your wedding website for ₹49 to get your permanent shareable link.");
  }

  return toPublicRenderView(draft);
}

export async function getPublishedBySlug(slug: string) {
  const website = await weddingWebsiteRepository.findBySlug(slug);
  if (!website || website.status !== "PUBLISHED") {
    return null;
  }
  return toPublicRenderView(website);
}

export function listPublishedSlugs() {
  return weddingWebsiteRepository.listPublishedSlugs();
}

// Events

export async function listEvents(weddingWebsiteId: string, ownerUserId: string) {
  await getOwnedDraftOrThrow(weddingWebsiteId, ownerUserId);
  return weddingWebsiteRepository.listEvents(weddingWebsiteId);
}

export async function createEvent(weddingWebsiteId: string, ownerUserId: string, input: CreateWeddingWebsiteEventBody) {
  await getOwnedDraftOrThrow(weddingWebsiteId, ownerUserId);
  return weddingWebsiteRepository.createEvent(weddingWebsiteId, input);
}

async function getOwnedEventOrThrow(eventId: string, ownerUserId: string) {
  const event = await weddingWebsiteRepository.findEventById(eventId);
  if (!event) {
    throw new NotFoundError("Event not found");
  }
  await getOwnedDraftOrThrow(event.weddingWebsiteId, ownerUserId);
  return event;
}

export async function updateEvent(eventId: string, ownerUserId: string, input: UpdateWeddingWebsiteEventBody) {
  await getOwnedEventOrThrow(eventId, ownerUserId);
  return weddingWebsiteRepository.updateEvent(eventId, input);
}

export async function deleteEvent(eventId: string, ownerUserId: string): Promise<void> {
  await getOwnedEventOrThrow(eventId, ownerUserId);
  await weddingWebsiteRepository.deleteEvent(eventId);
}

// RSVP — public submit, owner-only read (Business Rule 8: public visitors
// cannot access draft/dashboard data; RSVP list is dashboard data).

export async function submitRsvp(slug: string, input: SubmitRsvpBody) {
  const website = await weddingWebsiteRepository.findBySlug(slug);
  if (!website || website.status !== "PUBLISHED") {
    throw new NotFoundError("Wedding website not found");
  }
  return weddingWebsiteRepository.createRsvp(website.id, input);
}

export async function listRsvps(weddingWebsiteId: string, ownerUserId: string) {
  await getOwnedDraftOrThrow(weddingWebsiteId, ownerUserId);
  return weddingWebsiteRepository.listRsvps(weddingWebsiteId);
}

// Publish — called only from the Razorpay webhook's payment.captured
// handler once payment is verified (Business Rule 4/9: no permanent
// public website before backend-verified payment). Idempotent: if the
// website is already PUBLISHED, this is a no-op rather than
// re-generating a slug or re-firing publish side effects (Business Rule
// 10 — a duplicate webhook must not double-publish).
export async function publishWeddingWebsite(weddingWebsiteId: string): Promise<void> {
  const website = await weddingWebsiteRepository.findById(weddingWebsiteId);
  if (!website) {
    throw new NotFoundError("Wedding website not found");
  }
  if (website.status === "PUBLISHED") {
    return;
  }
  if (!website.brideName || !website.groomName) {
    throw new ValidationError("Wedding website is missing required details and cannot be published");
  }

  const base = slugify(`${website.brideName}-weds-${website.groomName}`);
  const slug = await generateUniqueSlug(base, async (candidate) =>
    Boolean(await weddingWebsiteRepository.findBySlugAnyCase(candidate)),
  );

  await weddingWebsiteRepository.publish(weddingWebsiteId, slug);
}

// Payment — creates the Razorpay order for the ₹49 publish charge.
// Mirrors subscription.service.ts's initiateUpgrade exactly: NO
// WeddingWebsite.status change happens here — the website only becomes
// PUBLISHED once the webhook confirms payment.captured (Business Rule 4/
// 9: never trust the frontend, backend-only verification). Already-
// published websites can't be charged again (Business Rule 6/
// "Already Paid Website").
export async function createPublishOrder(id: string, ownerUserId: string) {
  const draft = await getOwnedDraftOrThrow(id, ownerUserId);

  if (draft.status === "PUBLISHED") {
    throw new ConflictError("This wedding website is already published");
  }

  const amountInSmallestUnit = Math.round(env.WEDDING_WEBSITE_PRICE_INR * 100);
  const { orderId } = await createOrder({
    amountInSmallestUnit,
    currency: "INR",
    // Same 56-char Razorpay receipt limit subscription.service.ts hit
    // live — kept short, full weddingWebsiteId travels in notes instead.
    receipt: `ww_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    notes: { weddingWebsiteId: id },
  });

  const payment = await weddingWebsiteRepository.createPendingPayment({
    weddingWebsiteId: id,
    razorpayOrderId: orderId,
    amount: env.WEDDING_WEBSITE_PRICE_INR,
    currency: "INR",
  });

  return { orderId, paymentId: payment.id, amount: env.WEDDING_WEBSITE_PRICE_INR, currency: "INR" };
}

// Admin read-only visibility

export async function listAllForAdmin(page: number, limit: number) {
  const [items, total] = await Promise.all([
    weddingWebsiteRepository.listAllForAdmin(page, limit),
    weddingWebsiteRepository.countAllForAdmin(),
  ]);
  return { items, total };
}
