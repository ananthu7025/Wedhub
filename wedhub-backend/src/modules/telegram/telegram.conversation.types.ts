// Shape of TelegramConversation.collectedData — built up across states
// until CONFIRMING_ENQUIRY creates the real Enquiry/Lead rows. Nothing here
// is durable business data on its own; it's scratch state for one
// in-progress conversation, matching product.md §35's "state must be
// persisted, not in-memory" without inventing a home for half-finished
// enquiries in the real Enquiry table.
export interface CollectedData {
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
