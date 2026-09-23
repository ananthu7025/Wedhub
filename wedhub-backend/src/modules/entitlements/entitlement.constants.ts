// architecture.md §26's canonical entitlement keys. Every plan-gated check in
// the codebase must go through one of these keys via entitlement.service —
// never a raw `plan.tier === "PREMIUM"` check (Coding Rule 8; also, plans no
// longer have a meaningful tier at all — see PLAN-2026-09-22-dynamic-plans-
// and-feature-registry.md). This is a FIXED catalog, not admin-definable:
// every key here must have real enforcement code somewhere in the app. An
// admin can configure per-plan VALUES for these keys (on/off, or a limit
// number) through /admin/subscriptions, but cannot invent a new key from the
// UI — a toggle with no code behind it would silently do nothing.
export const Entitlement = {
  PORTFOLIO_LIMIT: "portfolio_limit",
  VIDEO_LIMIT: "video_limit",
  MONTHLY_LEAD_LIMIT: "monthly_lead_limit",
  ANALYTICS_LEVEL: "analytics_level",
  FEATURED_ELIGIBILITY: "featured_eligibility",
  STORE_ACCESS: "store_access",
  INVOICING_ACCESS: "invoicing_access",
  PORTFOLIO_PAGE_ACCESS: "portfolio_page_access",
  CATALOG_ACCESS: "catalog_access",
  RULE_BOOK_ACCESS: "rule_book_access",
} as const;

export type EntitlementKey = (typeof Entitlement)[keyof typeof Entitlement];

export type AnalyticsLevel = "basic" | "advanced";

export interface PlanLimits {
  portfolio_limit: number;
  video_limit: number;
  // 0 means unlimited — the one sentinel value in this catalog's limits
  // (every other limit is a real, always-enforced cap). See FEATURE_CATALOG's
  // entry below and entitlement.service.ts's enforcement for where this
  // matters. Documented here too since PlanLimits is the type callers read.
  monthly_lead_limit: number;
}

export interface PlanFeatures {
  analytics_level: AnalyticsLevel;
  featured_eligibility: boolean;
  store_access: boolean;
  invoicing_access: boolean;
  portfolio_page_access: boolean;
  catalog_access: boolean;
  rule_book_access: boolean;
}

// The boolean-typed subset of PlanFeatures — the union canVendorUse()/
// assertVendorFeatureAccess() accept. Derived once here so adding a new
// boolean feature to the catalog below never requires touching those
// functions' type signatures by hand.
export type BooleanFeatureKey = Exclude<keyof PlanFeatures, "analytics_level">;

export type FeatureValueType = "boolean" | "limit";

export interface FeatureDefinition {
  key: EntitlementKey;
  label: string;
  description: string;
  valueType: FeatureValueType;
  defaultValue: boolean | number;
}

// The single source of truth for "what features can a plan have," rendered
// generically by PlanFormModal.tsx (admin) and the vendor plan-card feature
// list — both loop over this array rather than hardcoding a <li>/<input> per
// key, so adding a 7th feature here is the only code change needed for it to
// show up in both UIs (its enforcement call site is a separate, deliberate
// change — see entitlement.service.ts).
//
// analytics_level is a string enum ("basic"|"advanced") internally, but
// modeled as a boolean toggle here ("Advanced Analytics: on/off") since
// that's the only real distinction — readFeatures() maps the toggle to the
// string under the hood.
export const FEATURE_CATALOG: FeatureDefinition[] = [
  {
    key: Entitlement.PORTFOLIO_LIMIT,
    label: "Portfolio Images",
    description: "Maximum number of active portfolio photos",
    valueType: "limit",
    defaultValue: 10,
  },
  {
    key: Entitlement.VIDEO_LIMIT,
    label: "Videos",
    description: "Maximum number of active portfolio videos",
    valueType: "limit",
    defaultValue: 1,
  },
  {
    key: Entitlement.MONTHLY_LEAD_LIMIT,
    label: "Monthly Leads",
    description: "Maximum new leads received per calendar month (0 = unlimited)",
    valueType: "limit",
    defaultValue: 0,
  },
  {
    key: Entitlement.ANALYTICS_LEVEL,
    label: "Advanced Analytics",
    description: "90-day history with daily breakdown (vs. basic 30-day history)",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: Entitlement.FEATURED_ELIGIBILITY,
    label: "Featured Placement",
    description: "Vendor can be assigned homepage/category/city/search featured slots by admin",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: Entitlement.STORE_ACCESS,
    label: "Vendor Store",
    description: "Branded storefront with WhatsApp ordering",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: Entitlement.INVOICING_ACCESS,
    label: "Invoicing & Billing",
    description: "GST invoices and payment tracking",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: Entitlement.PORTFOLIO_PAGE_ACCESS,
    label: "Shareable Portfolio Page",
    description: "Public /portfolio/:slug page vendors can share via link, QR code, or social bio",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: Entitlement.CATALOG_ACCESS,
    label: "Catalog",
    description: "Individual catalog items with variants, pricing, photos, CSV import, and availability calendars (catalog-eligible categories only)",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: Entitlement.RULE_BOOK_ACCESS,
    label: "Rule Book Sharing",
    description: "Upload a rule book document and send it to a couple from an ongoing inbox conversation",
    valueType: "boolean",
    defaultValue: false,
  },
];

// Last-resort fallback if, somehow, no SubscriptionPlan row is currently
// flagged isDefault (should be unreachable given the DB's partial unique
// index plus seed data, but getEffectivePlan() must never throw for a vendor
// with no subscription — every other module depends on that invariant).
export const FALLBACK_PLAN_LIMITS: PlanLimits = {
  portfolio_limit: 10,
  video_limit: 1,
  monthly_lead_limit: 0,
};

export const FALLBACK_PLAN_FEATURES: PlanFeatures = {
  analytics_level: "basic",
  featured_eligibility: false,
  store_access: false,
  invoicing_access: false,
  portfolio_page_access: false,
  catalog_access: false,
  rule_book_access: false,
};
