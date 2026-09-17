/**
 * Backend response shapes for GET/POST /messaging/* — verified field-by-field
 * against wedhub-backend's messaging module (built 2026-09-16, item 7 of the
 * signup/onboarding/inbox request — see PLAN-2026-09-16-signup-onboarding-inbox.md
 * Phase 5).
 */

export interface ConversationVendorSummary {
  id: string;
  businessName: string;
  slug: string;
  ownerUserId: string | null;
}

export interface ConversationCoupleSummary {
  id: string;
  email: string;
  profile: { firstName: string | null; lastName: string | null } | null;
}

export interface ConversationLastMessage {
  body: string;
  senderUserId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  coupleUserId: string;
  vendorId: string;
  leadId: string | null;
  enquiryId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  vendor: ConversationVendorSummary;
  coupleUser: ConversationCoupleSummary;
}

export interface ConversationListItem extends Conversation {
  lastMessage: ConversationLastMessage | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface StartConversationBody {
  vendorId: string;
  leadId?: string;
  enquiryId?: string;
}
