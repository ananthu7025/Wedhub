import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { env } from "../../config/env";
import { createOrder, createPaymentLink } from "../../integrations/payment/razorpay.client";
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
// docs/12-stage-wedding-website.md's "Ownership" decision). This owner
// reference is a discriminated union rather than two parallel function
// sets (getOwnedDraftOrThrowForUser / ...ForTelegramUser) precisely to
// avoid the copy-paste-per-owner-kind pattern this codebase has
// deliberately moved away from elsewhere (see slug.util.ts's
// generateUniqueSlug extraction) — every mutation below (updateDraft,
// generatePreview, events, createPublishOrder) now works unmodified for
// either owner kind by threading this type through instead of assuming
// ownerUserId. Throws NotFoundError rather than AuthorizationError for a
// draft owned by someone else, matching this codebase's existing
// convention of not revealing whether a resource exists to a caller who
// doesn't own it (same pattern as getOwnedVendorOrThrow).
export type WeddingWebsiteOwnerRef = { kind: "USER"; id: string } | { kind: "TELEGRAM_USER"; id: string };

async function getOwnedDraftOrThrow(id: string, owner: WeddingWebsiteOwnerRef) {
  const draft =
    owner.kind === "USER"
      ? await weddingWebsiteRepository.findOwnedByUser(id, owner.id)
      : await weddingWebsiteRepository.findOwnedByTelegramUser(id, owner.id);
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

export async function getOwnDraft(id: string, owner: WeddingWebsiteOwnerRef) {
  return getOwnedDraftOrThrow(id, owner);
}

export async function updateDraft(id: string, owner: WeddingWebsiteOwnerRef, input: UpdateWeddingWebsiteBody) {
  await getOwnedDraftOrThrow(id, owner);
  return weddingWebsiteRepository.update(id, input);
}

// Business Rule 1: one free public preview per draft. Once previewUsedAt
// is set, this returns the SAME (now stale/expired-eventually) preview
// state rather than minting a new token — the caller (controller) checks
// previewUsedAt on the returned row to decide which message to show, per
// the feature spec's "already used" vs. "here's your preview" UX split.
export async function generatePreview(id: string, owner: WeddingWebsiteOwnerRef) {
  const draft = await getOwnedDraftOrThrow(id, owner);

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

export async function listEvents(weddingWebsiteId: string, owner: WeddingWebsiteOwnerRef) {
  await getOwnedDraftOrThrow(weddingWebsiteId, owner);
  return weddingWebsiteRepository.listEvents(weddingWebsiteId);
}

export async function createEvent(weddingWebsiteId: string, owner: WeddingWebsiteOwnerRef, input: CreateWeddingWebsiteEventBody) {
  await getOwnedDraftOrThrow(weddingWebsiteId, owner);
  return weddingWebsiteRepository.createEvent(weddingWebsiteId, input);
}

async function getOwnedEventOrThrow(eventId: string, owner: WeddingWebsiteOwnerRef) {
  const event = await weddingWebsiteRepository.findEventById(eventId);
  if (!event) {
    throw new NotFoundError("Event not found");
  }
  await getOwnedDraftOrThrow(event.weddingWebsiteId, owner);
  return event;
}

export async function updateEvent(eventId: string, owner: WeddingWebsiteOwnerRef, input: UpdateWeddingWebsiteEventBody) {
  await getOwnedEventOrThrow(eventId, owner);
  return weddingWebsiteRepository.updateEvent(eventId, input);
}

export async function deleteEvent(eventId: string, owner: WeddingWebsiteOwnerRef): Promise<void> {
  await getOwnedEventOrThrow(eventId, owner);
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

export async function listRsvps(weddingWebsiteId: string, owner: WeddingWebsiteOwnerRef) {
  await getOwnedDraftOrThrow(weddingWebsiteId, owner);
  return weddingWebsiteRepository.listRsvps(weddingWebsiteId);
}

// Publish — called only from the Razorpay webhook's payment.captured
// handler once payment is verified (Business Rule 4/9: no permanent
// public website before backend-verified payment). Idempotent: if the
// website is already PUBLISHED, this is a no-op rather than
// re-generating a slug or re-firing publish side effects (Business Rule
// 10 — a duplicate webhook must not double-publish).
export async function publishWeddingWebsite(weddingWebsiteId: string): Promise<{ slug: string }> {
  const website = await weddingWebsiteRepository.findById(weddingWebsiteId);
  if (!website) {
    throw new NotFoundError("Wedding website not found");
  }
  if (website.status === "PUBLISHED") {
    // website.slug is only ever null pre-publish — a PUBLISHED row always
    // has one set by the publish() call below, on this or an earlier call.
    return { slug: website.slug as string };
  }
  if (!website.brideName || !website.groomName) {
    throw new ValidationError("Wedding website is missing required details and cannot be published");
  }

  const base = slugify(`${website.brideName}-weds-${website.groomName}`);
  const slug = await generateUniqueSlug(base, async (candidate) =>
    Boolean(await weddingWebsiteRepository.findBySlugAnyCase(candidate)),
  );

  await weddingWebsiteRepository.publish(weddingWebsiteId, slug);
  return { slug };
}

// Payment — creates the Razorpay order for the ₹49 publish charge.
// Mirrors subscription.service.ts's initiateUpgrade exactly: NO
// WeddingWebsite.status change happens here — the website only becomes
// PUBLISHED once the webhook confirms payment.captured (Business Rule 4/
// 9: never trust the frontend, backend-only verification). Already-
// published websites can't be charged again (Business Rule 6/
// "Already Paid Website").
export async function createPublishOrder(id: string, owner: WeddingWebsiteOwnerRef) {
  const draft = await getOwnedDraftOrThrow(id, owner);

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

// Telegram's payment path — a Payment Link (not an Order+Checkout.js
// order), since there's no browser inside a Telegram chat. Same
// business rules as createPublishOrder above (no status change here,
// already-published check first) — only the Razorpay call and the
// Payment row's correlation key differ. contactPhone is optional —
// Telegram never exposes a user's real phone number without a separate
// share-contact flow this stage doesn't build, and createPaymentLink
// simply omits it from the Razorpay request rather than sending a
// synthesized placeholder (see that function's comment for why: a fake
// number can fail Razorpay's own format validation).
export async function createPublishPaymentLink(
  id: string,
  ownerTelegramUserId: string,
  contact: { contactName: string; contactPhone: string | undefined },
) {
  const draft = await getOwnedDraftOrThrow(id, { kind: "TELEGRAM_USER", id: ownerTelegramUserId });

  if (draft.status === "PUBLISHED") {
    throw new ConflictError("This wedding website is already published");
  }

  const amountInSmallestUnit = Math.round(env.WEDDING_WEBSITE_PRICE_INR * 100);
  const { paymentLinkId, shortUrl } = await createPaymentLink({
    amountInSmallestUnit,
    currency: "INR",
    description: `Publish ${draft.brideName} & ${draft.groomName}'s Wedding Website`,
    contactName: contact.contactName,
    contactPhone: contact.contactPhone,
    notes: { weddingWebsiteId: id },
  });

  const payment = await weddingWebsiteRepository.createPendingPaymentLinkPayment({
    weddingWebsiteId: id,
    razorpayPaymentLinkId: paymentLinkId,
    amount: env.WEDDING_WEBSITE_PRICE_INR,
    currency: "INR",
  });

  return { paymentLinkId, shortUrl, paymentId: payment.id, amount: env.WEDDING_WEBSITE_PRICE_INR, currency: "INR" };
}

// webhook.service.ts's payment_link.paid handler — the Payment Link
// equivalent of subscription.repository's findPaymentByOrderId, since a
// Payment Link's payment correlates back to our Payment row via the
// link's own id, not a pre-known order_id (see schema.prisma's
// Payment.razorpayPaymentLinkId comment).
export function findPaymentByPaymentLinkId(razorpayPaymentLinkId: string) {
  return weddingWebsiteRepository.findPaymentByPaymentLinkId(razorpayPaymentLinkId);
}

// Admin read-only visibility

export async function listAllForAdmin(page: number, limit: number) {
  const [items, total] = await Promise.all([
    weddingWebsiteRepository.listAllForAdmin(page, limit),
    weddingWebsiteRepository.countAllForAdmin(),
  ]);
  return { items, total };
}
