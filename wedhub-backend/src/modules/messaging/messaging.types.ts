export interface ConversationParticipant {
  coupleUserId: string;
  vendorId: string;
}

export interface StartConversationInput extends ConversationParticipant {
  leadId?: string | undefined;
  enquiryId?: string | undefined;
}

export interface SendMessageInput {
  conversationId: string;
  senderUserId: string;
  body: string;
}
