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
