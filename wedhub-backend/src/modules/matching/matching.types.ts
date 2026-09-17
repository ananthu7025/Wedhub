export interface MatchProfileInput {
  userId: string;
  weddingProfileId: string;
  cityId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | undefined;
  weddingDate: Date | null;
  guestCount: number | null;
  categoryPreferences: {
    categoryId: string;
    categoryName: string;
    budgetMin: number | null;
    budgetMax: number | null;
  }[];
}

export interface MatchResult {
  categoryId: string;
  matchedVendorIds: string[];
}
