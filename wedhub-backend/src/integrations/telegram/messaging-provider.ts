// product.md §33: "The architecture must not make Telegram part of the core
// business domain" — every module that sends a message (the conversation
// engine, and eventually Arch Phase 14's TELEGRAM notification channel)
// depends on this interface, never on `node-telegram-bot-api` directly.
// TelegramProvider is the only implementation today; WhatsAppProvider/
// WebChatProvider are the named "later" providers in the same section.
// Exactly one of callbackData/url is set — a callback button round-trips
// through our own conversation state machine (advanceConversation), a url
// button opens an external link directly (Telegram never sends us a
// callback_query for it). Arch Phase 26 needs url buttons for the
// Razorpay Payment Link sent inside WW_AWAITING_PAYMENT — a
// callback_data button can't open an external checkout page.
export type InlineButton = { text: string; callbackData: string; url?: undefined } | { text: string; url: string; callbackData?: undefined };

export interface SendMessageOptions {
  buttons?: InlineButton[][];
}

export interface MessagingProvider {
  sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<{ messageId: string }>;
  sendMedia(chatId: string, mediaUrl: string, caption: string | undefined): Promise<{ messageId: string }>;
  // Conversation lifecycle here is a provider-facing concept (e.g. closing
  // a WebChat session) — deliberately a no-op for Telegram, which has no
  // equivalent close action; the actual conversation STATE machine lives in
  // telegram.conversation.service, not in the provider.
  createConversation(chatId: string): Promise<void>;
  closeConversation(chatId: string): Promise<void>;
}
