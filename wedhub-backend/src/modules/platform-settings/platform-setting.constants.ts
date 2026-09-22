// The deliberately small, fixed set of platform-wide settings this module
// serves — see PLAN-2026-09-22-premium-feature-buildout.md §7 for why this
// stays a narrow, explicit list rather than a freeform key-value API an
// admin (or a bug) could write arbitrary keys into.
export const PlatformSettingKey = {
  LEAD_UNLOCK_PRICE_INR: "lead_unlock_price_inr",
} as const;

export type PlatformSettingKeyType = (typeof PlatformSettingKey)[keyof typeof PlatformSettingKey];

// Used only when a setting has never been explicitly configured by an admin
// (a fresh database, or before anyone has visited the settings screen) —
// never treated as the source of truth once a real PlatformSetting row
// exists for that key.
export const PLATFORM_SETTING_FALLBACKS: Record<PlatformSettingKeyType, number> = {
  [PlatformSettingKey.LEAD_UNLOCK_PRICE_INR]: 49,
};
