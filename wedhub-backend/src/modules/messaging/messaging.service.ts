import { AuthorizationError, NotFoundError, ValidationError } from "../../common/errors";
import * as notificationService from "../notifications/notification.service";
import * as vendorPolicy from "../vendors/vendor.policy";
import * as vendorRepository from "../vendors/vendor.repository";
import * as messagingRepository from "./messaging.repository";

const MESSAGE_PREVIEW_LENGTH = 120;

function toPreview(body: string): string {
  return body.length > MESSAGE_PREVIEW_LENGTH ? `${body.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : body;
}

function displayName(coupleUser: { email: string; profile: { firstName: string | null; lastName: string | null } | null }): string {
  const name = [coupleUser.profile?.firstName, coupleUser.profile?.lastName].filter(Boolean).join(" ");
  return name || coupleUser.email;
}

// Resolves which side of the conversation viewerUserId actually is, throwing
// if they're neither — this is the one authz check every other function in
// this service routes through, so a caller can never read/write a
// conversation they aren't a participant in (couple themselves, or the
// vendor's owner account).
async function resolveParticipant(conversationId: string, viewerUserId: string) {
  const conversation = await messagingRepository.findConversationById(conversationId);
  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }
  const isCouple = conversation.coupleUserId === viewerUserId;
  const isVendorOwner = conversation.vendor.ownerUserId === viewerUserId;
  if (!isCouple && !isVendorOwner) {
    throw new AuthorizationError("You are not a participant in this conversation");
  }
  return { conversation, isCouple, isVendorOwner };
}

// Start-or-get-existing a conversation with a specific vendor. Called from
// the couple side only (a couple always initiates — see routes) with an
// optional leadId/enquiryId provenance link. vendorId must resolve to a
// real, owned vendor or this throws — a conversation can't exist against a
// vendor with no owner account to ever read the vendor side of it.
export async function startConversation(
  coupleUserId: string,
  input: { vendorId: string; leadId?: string | undefined; enquiryId?: string | undefined },
) {
  const vendor = await vendorRepository.findVendorById(input.vendorId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  if (!vendor.ownerUserId) {
    throw new ValidationError("This vendor listing has no owner account to message yet");
  }
  return messagingRepository.upsertConversation({
    coupleUserId,
    vendorId: input.vendorId,
    leadId: input.leadId,
    enquiryId: input.enquiryId,
  });
}

// Item 20: "has this couple already enquired with this vendor" — a real
// answer, not the old time-windowed dedupe hash, since a Conversation is
// keyed on the pair itself and never expires. Returns the existing
// conversation's id so the caller can link straight into it, or null if
// they've never been connected.
export async function findExistingConversation(coupleUserId: string, vendorId: string): Promise<string | null> {
  const conversation = await messagingRepository.findConversationByCoupleAndVendor(coupleUserId, vendorId);
  return conversation?.id ?? null;
}

export async function listMyConversations(viewerUserId: string, viewerRole: "END_USER" | "VENDOR", page: number, limit: number) {
  if (viewerRole === "VENDOR") {
    const vendor = await vendorPolicy.getOwnedVendorOrThrow(viewerUserId);
    return messagingRepository.listConversationsForVendor(vendor.id, viewerUserId, page, limit);
  }
  return messagingRepository.listConversationsForCouple(viewerUserId, page, limit);
}

export async function listMessages(conversationId: string, viewerUserId: string, page: number, limit: number) {
  await resolveParticipant(conversationId, viewerUserId);
  return messagingRepository.listMessages(conversationId, page, limit);
}

// Sends a message, then notifies the OTHER participant — role-agnostic by
// design (item 7/8: both couples and vendors get an in-app inbox, and a
// message from either side should notify the other). Never blocks the send
// on notify() failing (notify()'s own "never throws" contract).
export async function sendMessage(conversationId: string, senderUserId: string, body: string) {
  const { conversation, isCouple } = await resolveParticipant(conversationId, senderUserId);
  const message = await messagingRepository.createMessage({ conversationId, senderUserId, body });

  const recipientUserId = isCouple ? conversation.vendor.ownerUserId : conversation.coupleUserId;
  if (recipientUserId) {
    const senderName = isCouple ? displayName(conversation.coupleUser) : conversation.vendor.businessName;
    await notificationService.notify({
      userId: recipientUserId,
      eventType: "NEW_MESSAGE",
      data: { senderName, preview: toPreview(body) },
      relatedEntityType: "conversation",
      relatedEntityId: conversationId,
    });
  }

  return message;
}

export async function markRead(conversationId: string, viewerUserId: string): Promise<void> {
  await resolveParticipant(conversationId, viewerUserId);
  await messagingRepository.markConversationRead(conversationId, viewerUserId);
}

export async function getUnreadCount(viewerUserId: string, viewerRole: "END_USER" | "VENDOR"): Promise<number> {
  if (viewerRole === "VENDOR") {
    const vendor = await vendorPolicy.getOwnedVendorOrThrow(viewerUserId);
    return messagingRepository.countUnreadForVendor(vendor.id, viewerUserId);
  }
  return messagingRepository.countUnreadForCouple(viewerUserId);
}
