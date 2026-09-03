import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

// Render-necessary fields only — no owner info, no payment info, no
// preview-token internals. Reused for both preview mode and published
// mode (docs/12-stage-wedding-website.md Business Rule 12: same renderer,
// same data shape either way).
const RENDER_INCLUDE = {
  coverMedia: true,
  couplePhotoMedia: true,
  events: { orderBy: { sortOrder: "asc" as const } },
  gallery: { where: { status: "READY" as const }, orderBy: { sortOrder: "asc" as const } },
} as const;

const OWNER_INCLUDE = {
  ...RENDER_INCLUDE,
} as const;

export function findById(id: string) {
  return prisma.weddingWebsite.findUnique({ where: { id }, include: OWNER_INCLUDE });
}

export function findBySlug(slug: string) {
  return prisma.weddingWebsite.findUnique({ where: { slug }, include: RENDER_INCLUDE });
}

export function findByPreviewTokenHash(previewTokenHash: string) {
  return prisma.weddingWebsite.findFirst({ where: { previewTokenHash }, include: RENDER_INCLUDE });
}

export function findBySlugAnyCase(slug: string) {
  return prisma.weddingWebsite.findFirst({ where: { slug } });
}

// Public, minimal — backs the frontend's sitemap.ts, same pattern as the
// seo module's GET /seo/combinations. Only slug + updatedAt, nothing else
// (no owner/payment info, matching this module's other public reads).
export function listPublishedSlugs() {
  return prisma.weddingWebsite.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

// Ownership is exactly-one-of ownerUserId / ownerTelegramUserId — this
// finds the caller's own draft(s) regardless of which owner column
// applies, so the same repository function serves both the web API
// (ownerUserId) and the Telegram flow (ownerTelegramUserId).
export function findOwnedByUser(id: string, ownerUserId: string) {
  return prisma.weddingWebsite.findFirst({ where: { id, ownerUserId }, include: OWNER_INCLUDE });
}

export function findOwnedByTelegramUser(id: string, ownerTelegramUserId: string) {
  return prisma.weddingWebsite.findFirst({ where: { id, ownerTelegramUserId }, include: OWNER_INCLUDE });
}

export function listOwnedByUser(ownerUserId: string) {
  return prisma.weddingWebsite.findMany({ where: { ownerUserId }, orderBy: { createdAt: "desc" }, include: OWNER_INCLUDE });
}

export function createForUser(ownerUserId: string, data: { template: string; brideName: string; groomName: string }) {
  return prisma.weddingWebsite.create({
    data: { ownerUserId, template: data.template as never, brideName: data.brideName, groomName: data.groomName },
    include: OWNER_INCLUDE,
  });
}

export function createForTelegramUser(
  ownerTelegramUserId: string,
  data: { template: string; brideName: string; groomName: string },
) {
  return prisma.weddingWebsite.create({
    data: { ownerTelegramUserId, template: data.template as never, brideName: data.brideName, groomName: data.groomName },
    include: OWNER_INCLUDE,
  });
}

export interface WeddingWebsiteUpdateFields {
  template?: string | undefined;
  brideName?: string | undefined;
  groomName?: string | undefined;
  weddingDate?: Date | undefined;
  weddingTime?: string | undefined;
  venueName?: string | undefined;
  venueAddress?: string | undefined;
  googleMapsUrl?: string | undefined;
  shortDescription?: string | undefined;
  brideParents?: string | undefined;
  groomParents?: string | undefined;
  weddingHashtag?: string | undefined;
  contactInfo?: string | undefined;
  socialLinks?: Record<string, string> | undefined;
  coupleStory?: string | undefined;
  brideDescription?: string | undefined;
  groomDescription?: string | undefined;
  howWeMet?: string | undefined;
  coverMediaId?: string | null | undefined;
  couplePhotoMediaId?: string | null | undefined;
}

export function update(id: string, data: WeddingWebsiteUpdateFields) {
  const fields = omitUndefined(data);
  return prisma.weddingWebsite.update({
    where: { id },
    data: { ...fields, template: fields.template as never },
    include: OWNER_INCLUDE,
  });
}

export function setPreview(id: string, data: { previewTokenHash: string; previewCreatedAt: Date; previewExpiresAt: Date }) {
  return prisma.weddingWebsite.update({
    where: { id },
    data: { ...data, previewUsedAt: data.previewCreatedAt },
    include: OWNER_INCLUDE,
  });
}

export function publish(id: string, slug: string) {
  return prisma.weddingWebsite.update({
    where: { id },
    data: { status: "PUBLISHED", slug, previewTokenHash: null, publishedAt: new Date() },
  });
}

// Payment (₹49 publish charge)

export function createPendingPayment(data: { weddingWebsiteId: string; razorpayOrderId: string; amount: number; currency: string }) {
  return prisma.payment.create({
    data: {
      purpose: "WEDDING_WEBSITE",
      weddingWebsiteId: data.weddingWebsiteId,
      razorpayOrderId: data.razorpayOrderId,
      amount: data.amount,
      currency: data.currency,
    },
  });
}

// Events

export function listEvents(weddingWebsiteId: string) {
  return prisma.weddingWebsiteEvent.findMany({ where: { weddingWebsiteId }, orderBy: { sortOrder: "asc" } });
}

export function findEventById(id: string) {
  return prisma.weddingWebsiteEvent.findUnique({ where: { id } });
}

export function createEvent(
  weddingWebsiteId: string,
  data: { name: string; date?: Date | undefined; time?: string | undefined; venue?: string | undefined; description?: string | undefined },
) {
  const fields = omitUndefined({ date: data.date, time: data.time, venue: data.venue, description: data.description });
  return prisma.weddingWebsiteEvent.create({ data: { weddingWebsiteId, name: data.name, ...fields } });
}

export interface EventUpdateFields {
  name?: string | undefined;
  date?: Date | null | undefined;
  time?: string | null | undefined;
  venue?: string | null | undefined;
  description?: string | null | undefined;
  sortOrder?: number | undefined;
}

export function updateEvent(id: string, data: EventUpdateFields) {
  return prisma.weddingWebsiteEvent.update({ where: { id }, data: omitUndefined(data) });
}

export function deleteEvent(id: string) {
  return prisma.weddingWebsiteEvent.delete({ where: { id } });
}

// RSVPs

export function createRsvp(
  weddingWebsiteId: string,
  data: { name: string; attending: string; guestCount?: number | undefined; message?: string | undefined },
) {
  const fields = omitUndefined({ guestCount: data.guestCount, message: data.message });
  return prisma.weddingWebsiteRsvp.create({
    data: { weddingWebsiteId, name: data.name, attending: data.attending as never, ...fields },
  });
}

export function listRsvps(weddingWebsiteId: string) {
  return prisma.weddingWebsiteRsvp.findMany({ where: { weddingWebsiteId }, orderBy: { createdAt: "desc" } });
}

// Admin visibility (read-only — see docs/12-stage-wedding-website.md's
// explicit "do not build a large admin system" instruction)

const ADMIN_LIST_INCLUDE = {
  ownerUser: { select: { id: true, email: true } },
  ownerTelegramUser: { select: { id: true, username: true, firstName: true, lastName: true } },
  payments: { orderBy: { createdAt: "desc" as const }, take: 1 },
} as const;

export function listAllForAdmin(page: number, limit: number) {
  return prisma.weddingWebsite.findMany({
    orderBy: { createdAt: "desc" },
    include: ADMIN_LIST_INCLUDE,
    skip: (page - 1) * limit,
    take: limit,
  });
}

export function countAllForAdmin() {
  return prisma.weddingWebsite.count();
}
