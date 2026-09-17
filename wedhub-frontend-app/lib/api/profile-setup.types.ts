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
  // Item 7 (2026-09-17): collected here for customers completing the
  // wizard, but written via updateMyProfile — this is User.phone, a
  // separate model from WeddingProfile, so it's not part of
  // submitProfileSetup's own payload. Prefilled from GET /users/me when
  // already on file (see ProfileSetupWizard.tsx), so revisiting the wizard
  // never clears an already-saved number.
  phone: string;
  eventDates: EventDateDraft[];
  categoryPreferences: CategoryPreferenceDraft[];
}

export const EMPTY_PROFILE_SETUP_DRAFT: ProfileSetupDraft = {
  cityId: "",
  guestCount: "",
  weddingStyle: "",
  partnerName: "",
  notes: "",
  phone: "",
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
