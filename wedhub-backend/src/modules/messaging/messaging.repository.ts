import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { toPageParams } from "../../common/utils/pagination.util";
import type { SendMessageInput, StartConversationInput } from "./messaging.types";

// Minimal vendor shape needed for messaging authz/display — deliberately not
// vendor.repository.ts's VENDOR_FULL_INCLUDE (profile/categories/packages
// etc.), which this module never needs and would be wasted work on every
// conversation-list render.
const CONVERSATION_VENDOR_SELECT = {
  id: true,
  businessName: true,
  slug: true,
  ownerUserId: true,
} satisfies Prisma.VendorSelect;

const CONVERSATION_COUPLE_SELECT = {
  id: true,
  email: true,
  profile: { select: { firstName: true, lastName: true } },
} satisfies Prisma.UserSelect;

const MESSAGE_MEDIA_SELECT = {
  id: true,
  mimeType: true,
  fileSize: true,
  originalObjectKey: true,
} satisfies Prisma.MediaSelect;

// Item 6 — ownership check for sendMessage's optional mediaId: the vendor
// on this conversation's side must own the media being attached.
export function findOwnVendorMedia(vendorId: string, mediaId: string) {
  return prisma.media.findFirst({ where: { id: mediaId, vendorId }, select: { id: true, status: true } });
}

export function findConversationById(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: { vendor: { select: CONVERSATION_VENDOR_SELECT }, coupleUser: { select: CONVERSATION_COUPLE_SELECT } },
  });
}

// Read-only lookup by the same (coupleUserId, vendorId) unique pair
// upsertConversation keys on — used by enquiry.service.ts to detect "this
// couple has already reached this vendor" (item 20) without creating
// anything, unlike upsertConversation which always creates on a miss.
export function findConversationByCoupleAndVendor(coupleUserId: string, vendorId: string) {
  return prisma.conversation.findUnique({
    where: { coupleUserId_vendorId: { coupleUserId, vendorId } },
    select: { id: true },
  });
}

// Idempotent by design — the (coupleUserId, vendorId) unique constraint
// means a second "start conversation" call for the same pair returns the
// existing thread instead of erroring or creating a duplicate. leadId/
// enquiryId are only set on first creation (Prisma upsert's `create` branch);
// an existing conversation's provenance link is never overwritten by a
// later start-from-a-different-lead call.
export function upsertConversation(input: StartConversationInput) {
  return prisma.conversation.upsert({
    where: { coupleUserId_vendorId: { coupleUserId: input.coupleUserId, vendorId: input.vendorId } },
    create: {
      coupleUserId: input.coupleUserId,
      vendorId: input.vendorId,
      leadId: input.leadId ?? null,
      enquiryId: input.enquiryId ?? null,
    },
    update: {},
    include: { vendor: { select: CONVERSATION_VENDOR_SELECT }, coupleUser: { select: CONVERSATION_COUPLE_SELECT } },
  });
}

export interface ConversationListItem {
  id: string;
  coupleUserId: string;
  vendorId: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  vendor: { id: string; businessName: string; slug: string; ownerUserId: string | null };
  coupleUser: { id: string; email: string; profile: { firstName: string | null; lastName: string | null } | null };
  lastMessage: { body: string; senderUserId: string; createdAt: Date } | null;
  unreadCount: number;
}

// One caller-scoped query per role (couple sees their own conversations,
// vendor owner sees theirs) — kept as two functions rather than one with a
// role branch, since the where-clause shape genuinely differs (coupleUserId
// vs vendor.ownerUserId) and forcing them into one function would need the
// same branch anyway.
async function listConversations(where: Prisma.ConversationWhereInput, viewerUserId: string, page: number, limit: number) {
  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        vendor: { select: CONVERSATION_VENDOR_SELECT },
        coupleUser: { select: CONVERSATION_COUPLE_SELECT },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderUserId: true, createdAt: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      ...toPageParams(page, limit),
    }),
    prisma.conversation.count({ where }),
  ]);

  const unreadCounts = await Promise.all(
    rows.map((row) =>
      prisma.message.count({
        where: { conversationId: row.id, senderUserId: { not: viewerUserId }, readAt: null },
      }),
    ),
  );

  const items: ConversationListItem[] = rows.map((row, i) => ({
    id: row.id,
    coupleUserId: row.coupleUserId,
    vendorId: row.vendorId,
    lastMessageAt: row.lastMessageAt,
    createdAt: row.createdAt,
    vendor: row.vendor,
    coupleUser: row.coupleUser,
    lastMessage: row.messages[0] ?? null,
    unreadCount: unreadCounts[i] ?? 0,
  }));

  return { items, total };
}

export function listConversationsForCouple(coupleUserId: string, page: number, limit: number) {
  return listConversations({ coupleUserId }, coupleUserId, page, limit);
}

export function listConversationsForVendor(vendorId: string, viewerUserId: string, page: number, limit: number) {
  return listConversations({ vendorId }, viewerUserId, page, limit);
}

export function listMessages(conversationId: string, page: number, limit: number) {
  return Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      include: { media: { select: MESSAGE_MEDIA_SELECT } },
      ...toPageParams(page, limit),
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);
}

// One transaction: write the message and bump the conversation's
// lastMessageAt together, so a conversation list's sort order can never
// observe a message that exists but hasn't moved its thread to the top yet.
export function createMessage(input: SendMessageInput) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId: input.conversationId,
        senderUserId: input.senderUserId,
        body: input.body,
        mediaId: input.mediaId ?? null,
      },
      include: { media: { select: MESSAGE_MEDIA_SELECT } },
    });
    await tx.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: message.createdAt },
    });
    return message;
  });
}

// Marks every message in the conversation NOT sent by viewerUserId as read —
// "mark this thread read" from the reader's perspective, mirroring
// notification.repository.ts's markAllRead pattern (updateMany, not update,
// for the same reason: no single row id to target, and racing this against
// a concurrent new message is fine — that new message just stays unread).
export function markConversationRead(conversationId: string, viewerUserId: string) {
  return prisma.message.updateMany({
    where: { conversationId, senderUserId: { not: viewerUserId }, readAt: null },
    data: { readAt: new Date() },
  });
}

export function countUnreadForCouple(coupleUserId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderUserId: { not: coupleUserId },
      conversation: { coupleUserId },
    },
  });
}

export function countUnreadForVendor(vendorId: string, viewerUserId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderUserId: { not: viewerUserId },
      conversation: { vendorId },
    },
  });
}
