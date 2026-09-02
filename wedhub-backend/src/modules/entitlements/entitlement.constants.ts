// architecture.md §26's canonical entitlement keys. Every plan-gated check in
// the codebase must go through one of these keys via entitlement.service —
// never a raw `plan.tier === "PREMIUM"` check (Coding Rule 8).
export const Entitlement = {
  PORTFOLIO_LIMIT: "portfolio_limit",
  VIDEO_LIMIT: "video_limit",
  LEAD_ACCESS: "lead_access",
  ANALYTICS_LEVEL: "analytics_level",
  FEATURED_ELIGIBILITY: "featured_eligibility",
  PROMOTIONAL_PLACEMENT: "promotional_placement",
  RESPONSE_TOOLS: "response_tools",
  PRIORITY_SUPPORT: "priority_support",
} as const;

export type EntitlementKey = (typeof Entitlement)[keyof typeof Entitlement];

export type AnalyticsLevel = "basic" | "advanced";

export interface PlanLimits {
  portfolio_limit: number;
  video_limit: number;
}

export interface PlanFeatures {
  analytics_level: AnalyticsLevel;
  lead_access: boolean;
  featured_eligibility: boolean;
  promotional_placement: boolean;
  response_tools: boolean;
  priority_support: boolean;
}

// product.md §54: "do not make free vendors useless" — a vendor with no
// SubscriptionPlan row seeded for FREE yet (or no Subscription row at all,
// which is the normal case per Scenario A) still gets these defaults. This
// is the ONE place a default lives; every other module must read through
// entitlement.service rather than re-declaring a number/flag of its own —
// this is exactly what replaces the old env.MEDIA_MAX_PORTFOLIO_ITEMS global.
export const FREE_PLAN_DEFAULT_LIMITS: PlanLimits = {
  portfolio_limit: 10,
  video_limit: 1,
};

export const FREE_PLAN_DEFAULT_FEATURES: PlanFeatures = {
  analytics_level: "basic",
  lead_access: true,
  featured_eligibility: false,
  promotional_placement: false,
  response_tools: false,
  priority_support: false,
};
