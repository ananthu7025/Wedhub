export interface NotificationPreferences {
  emailMarketing: boolean;
  emailTransactional: boolean;
  smsEnabled: boolean;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  preferredCategories: string[];
}

export interface ProfileUpdateInput {
  firstName: string | undefined;
  lastName: string | undefined;
  avatarUrl: string | undefined;
  bio: string | undefined;
  preferences: UserPreferences | undefined;
}

export interface WeddingProfileUpsertInput {
  weddingDate: string | undefined;
  guestCount: number | undefined;
  estimatedBudget: number | undefined;
  weddingStyle: string | undefined;
  partnerName: string | undefined;
  notes: string | undefined;
}

export type FunctionTypeValue = "ENGAGEMENT" | "SANGEET" | "MEHENDI" | "HALDI" | "WEDDING" | "RECEPTION" | "OTHER";

export interface EventDateInput {
  functionType: FunctionTypeValue;
  otherLabel: string | undefined;
  date: string;
  time: string | undefined;
  guestCount: number | undefined;
}

export interface CategoryPreferenceInput {
  categoryId: string;
  budgetMin: number | undefined;
  budgetMax: number | undefined;
}

export interface ProfileSetupInput {
  cityId: string;
  guestCount: number | undefined;
  weddingStyle: string | undefined;
  partnerName: string | undefined;
  notes: string | undefined;
  eventDates: EventDateInput[];
  categoryPreferences: CategoryPreferenceInput[];
}
