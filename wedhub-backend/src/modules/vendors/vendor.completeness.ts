import type { Prisma } from "@prisma/client";
import type { CompletenessResult } from "./vendor.types";

type VendorWithRelations = Prisma.VendorGetPayload<{
  include: {
    profile: true;
    categories: true;
    serviceAreas: true;
    services: true;
    packages: true;
    attributeValues: true;
  };
}>;

interface WeightedCheck {
  label: string;
  weight: number;
  isMet: (vendor: VendorWithRelations) => boolean;
}

const CHECKS: WeightedCheck[] = [
  { label: "Business name", weight: 10, isMet: (v) => v.businessName.length > 0 },
  { label: "Short description", weight: 10, isMet: (v) => !!v.profile?.shortDescription },
  { label: "Full description", weight: 10, isMet: (v) => !!v.profile?.description },
  { label: "Primary category", weight: 15, isMet: (v) => v.categories.some((c) => c.isPrimary) },
  { label: "Primary city", weight: 10, isMet: (v) => !!v.cityId },
  { label: "At least one service area", weight: 5, isMet: (v) => v.serviceAreas.length > 0 },
  {
    label: "Pricing information",
    weight: 10,
    isMet: (v) => v.profile?.startingPrice != null || !!v.profile?.customQuoteAvailable,
  },
  { label: "At least one package", weight: 5, isMet: (v) => v.packages.length > 0 },
  { label: "At least one service", weight: 10, isMet: (v) => v.services.length > 0 },
  {
    label: "A contact method",
    weight: 10,
    isMet: (v) => !!(v.profile?.phone || v.profile?.email || v.profile?.website),
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
  "A contact method",
  "At least one service",
];

export function calculateCompleteness(vendor: VendorWithRelations): CompletenessResult {
  let score = 0;
  const missing: string[] = [];

  for (const check of CHECKS) {
    if (check.isMet(vendor)) {
      score += check.weight;
    } else {
      missing.push(check.label);
    }
  }

  return { score, missing };
}

export function missingRequiredForSubmission(missing: string[]): string[] {
  return missing.filter((label) => REQUIRED_FOR_SUBMISSION_LABELS.includes(label));
}
