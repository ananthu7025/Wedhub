// Shape of TelegramConversation.collectedData — built up across states
// until the flow's real durable row(s) are created. A discriminated
// union keyed by TelegramConversation.flowType (Arch Phase 26) — the
// ENQUIRY shape is unchanged from before; WEDDING_WEBSITE is new.
//
// ENQUIRY: nothing here is durable business data on its own; it's scratch
// state for one in-progress conversation, matching product.md §35's
// "state must be persisted, not in-memory" without inventing a home for
// half-finished enquiries in the real Enquiry table — the real Enquiry/
// Lead only exists once CONFIRMING_ENQUIRY completes.
//
// WEDDING_WEBSITE: deliberately NOT "nothing durable until the end" —
// docs/12-stage-wedding-website.md's "Telegram flow design" decision is
// explicit that the real WeddingWebsite row is created early (as soon as
// a template is chosen, at the WW_SELECTING_TEMPLATE ->
// WW_COLLECTING_COUPLE_NAMES transition), specifically because photo
// uploads need a real weddingWebsiteId to attach to and can't defer to
// the end the way text fields can. Once created, every subsequent WW_*
// state writes straight to the real WeddingWebsite/WeddingWebsiteEvent
// rows via wedding-website.service.ts's TELEGRAM_USER-owner-ref
// functions — collectedData only needs to remember the in-progress
// event being built across a multi-message exchange (name -> venue ->
// description, one field per message) before it's saved as a real
// WeddingWebsiteEvent, plus the chosen template while still choosing it.
export interface EnquiryCollectedData {
  categoryId?: string;
  categoryName?: string;
  cityId?: string;
  cityName?: string;
  weddingDate?: string; // ISO date string — Json can't hold a Date
  budget?: number;
  guestCount?: number;
  contactPhone?: string;
  candidateVendorIds?: string[];
  selectedVendorId?: string;
}

export type WeddingWebsiteTemplateChoice = "ROYAL_WEDDING" | "MINIMAL_ELEGANT" | "TRADITIONAL_INDIAN";

export interface WeddingWebsiteCollectedData {
  template?: WeddingWebsiteTemplateChoice;
  // Held only between the bride-name prompt and the groom-name reply —
  // the real WeddingWebsite row can't be created until both names are
  // known (createDraftForTelegramUser requires both), so the bride's
  // name has nowhere durable to live for that one round-trip.
  brideNameDraft?: string;
  // WW_COLLECTING_VENUE's 3-part sequence (name -> address -> Google
  // Maps link), mirroring the web wizard's Venue fields — held here only
  // until the full venue is known, then written to the draft in one
  // updateDraft call (matches the web wizard's single-form-submit shape
  // rather than writing partial venue data 3 times).
  pendingVenueName?: string;
  pendingVenueAddress?: string;
  // WW_COLLECTING_BLESSINGS's 2-part sequence (bride's parents -> groom's
  // parents) — "With the blessings of" section, mirrors brideParents/
  // groomParents on WeddingWebsite (each a free-text block: names, then
  // house/family name on its own line).
  pendingBrideParents?: string;
  // In-progress event, collected across 2 short prompts
  // (name -> venue) before being saved as a real WeddingWebsiteEvent —
  // mirrors the web wizard's EventsStep form fields, just spread across
  // separate messages instead of one form.
  pendingEventName?: string;
  pendingEventVenue?: string;
}

export type CollectedData = EnquiryCollectedData | WeddingWebsiteCollectedData;
