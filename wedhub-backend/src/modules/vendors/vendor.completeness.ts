import type { Prisma } from "@prisma/client";
import type { CompletenessResult } from "./vendor.types";

type VendorWithRelations = Prisma.VendorGetPayload<{
  include: {
    profile: true;
    categories: { include: { category: true } };
    serviceAreas: true;
    packages: true;
    attributeValues: true;
  };
}>;

interface WeightedCheck {
  label: string;
  weight: number;
  isMet: (vendor: VendorWithRelations) => boolean;
  // When present, the check is skipped entirely (neither scored nor listed
  // as missing) for vendors whose primary category fails this predicate.
  appliesTo?: (vendor: VendorWithRelations) => boolean;
}

// Venues are a single fixed location, not a coverage area (item 13) — the
// service-area check doesn't apply to them.
function isVenueVendor(vendor: VendorWithRelations): boolean {
  return vendor.categories.some((c) => c.isPrimary && c.category.slug === "venues");
}

const CHECKS: WeightedCheck[] = [
  { label: "Business name", weight: 20, isMet: (v) => v.businessName.length > 0 },
  { label: "Short description", weight: 10, isMet: (v) => !!v.profile?.shortDescription },
  { label: "Full description", weight: 10, isMet: (v) => !!v.profile?.description },
  { label: "Primary category", weight: 15, isMet: (v) => v.categories.some((c) => c.isPrimary) },
  { label: "Primary city", weight: 10, isMet: (v) => !!v.cityId },
  {
    label: "At least one service area",
    weight: 5,
    isMet: (v) => v.serviceAreas.length > 0,
    appliesTo: (v) => !isVenueVendor(v),
  },
  {
    label: "Pricing information",
    weight: 10,
    isMet: (v) => v.profile?.startingPrice != null || !!v.profile?.customQuoteAvailable,
  },
  { label: "At least one package", weight: 5, isMet: (v) => v.packages.length > 0 },
  {
    label: "Contact email",
    weight: 5,
    isMet: (v) => !!v.profile?.email,
  },
  {
    label: "Phone number",
    weight: 5,
    isMet: (v) => !!v.profile?.phone,
  },
  {
    label: "Category attribute values",
    weight: 5,
    isMet: (v) => v.attributeValues.length > 0,
  },
];

export const REQUIRED_FOR_SUBMISSION_LABELS = [
  "Business name",
  "Full description",
  "Primary category",
  "Primary city",
  "Contact email",
  "Phone number",
];

export function calculateCompleteness(vendor: VendorWithRelations): CompletenessResult {
  const applicableChecks = CHECKS.filter((check) => check.appliesTo?.(vendor) ?? true);
  const applicableWeight = applicableChecks.reduce((sum, check) => sum + check.weight, 0);

  let earned = 0;
  const missing: string[] = [];

  for (const check of applicableChecks) {
    if (check.isMet(vendor)) {
      earned += check.weight;
    } else {
      missing.push(check.label);
    }
  }

  // Re-normalize against only the checks that apply to this vendor, so a
  // category with an inapplicable check (e.g. Venues skipping "service
  // area") can still reach 100% rather than being capped below it.
  const score = applicableWeight > 0 ? Math.round((earned / applicableWeight) * 100) : 100;

  return { score, missing };
}

export function missingRequiredForSubmission(missing: string[]): string[] {
  return missing.filter((label) => REQUIRED_FOR_SUBMISSION_LABELS.includes(label));
}
