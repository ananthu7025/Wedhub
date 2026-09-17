/**
 * Shapes for POST/GET /users/me/profile-setup — the couple profile-setup
 * wizard (item 2, 2026-09-16 request). Verified against
 * wedhub-backend/src/modules/users/users.schema.ts's submitProfileSetupSchema.
 */

export type FunctionType = "ENGAGEMENT" | "SANGEET" | "MEHENDI" | "HALDI" | "WEDDING" | "RECEPTION" | "OTHER";

export const FUNCTION_TYPE_LABELS: Record<FunctionType, string> = {
  ENGAGEMENT: "Engagement",
  SANGEET: "Sangeet",
  MEHENDI: "Mehendi",
  HALDI: "Haldi",
  WEDDING: "Wedding",
  RECEPTION: "Reception",
  OTHER: "Other",
};

export interface EventDateDraft {
  functionType: FunctionType;
  otherLabel: string;
  date: string;
  time: string;
  guestCount: string;
}

export interface CategoryPreferenceDraft {
  categoryId: string;
  budgetMin: string;
  budgetMax: string;
}

export interface ProfileSetupDraft {
  // Required for Phase 6's vendor matching (item 8) to be location-aware —
  // added 2026-09-16 after discovering the wizard never actually asked for
  // this despite WeddingProfile.cityId existing on the schema already.
  cityId: string;
  guestCount: string;
  weddingStyle: string;
  partnerName: string;
  notes: string;
  eventDates: EventDateDraft[];
  categoryPreferences: CategoryPreferenceDraft[];
}

export const EMPTY_PROFILE_SETUP_DRAFT: ProfileSetupDraft = {
  cityId: "",
  guestCount: "",
  weddingStyle: "",
  partnerName: "",
  notes: "",
  eventDates: [],
  categoryPreferences: [],
};

export interface WeddingProfileEventDateResponse {
  id: string;
  functionType: FunctionType;
  otherLabel: string | null;
  date: string;
  time: string | null;
  guestCount: number | null;
}

export interface WeddingProfileCategoryPreferenceResponse {
  id: string;
  categoryId: string;
  budgetMin: string | null;
  budgetMax: string | null;
}

export interface WeddingProfileWithDetails {
  id: string;
  cityId: string | null;
  guestCount: number | null;
  weddingStyle: string | null;
  partnerName: string | null;
  notes: string | null;
  profileCompletedAt: string | null;
  eventDates: WeddingProfileEventDateResponse[];
  categoryPreferences: WeddingProfileCategoryPreferenceResponse[];
}
