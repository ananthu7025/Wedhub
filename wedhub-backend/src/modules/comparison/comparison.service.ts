import { NotFoundError, ValidationError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import * as comparisonRepository from "./comparison.repository";

function attributeValueFor(
  attributeId: string,
  values: { attributeId: string; valueText: string | null; valueNumber: unknown; valueBoolean: boolean | null; valueOptions: string[] }[],
): string | number | boolean | string[] | null {
  const match = values.find((v) => v.attributeId === attributeId);
  if (!match) {
    return null;
  }
  if (match.valueText !== null) return match.valueText;
  if (match.valueNumber !== null) return Number(match.valueNumber);
  if (match.valueBoolean !== null) return match.valueBoolean;
  if (match.valueOptions.length > 0) return match.valueOptions;
  return null;
}

// product.md §16: "Comparison should be category-aware" and "must use
// category-defined comparison attributes" — every vendor being compared
// must share the same primary category, otherwise the attribute set being
// compared (e.g. a photographer's "Photography Style" vs. a venue's
// "Capacity") wouldn't be meaningful side-by-side.
export async function compareVendors(vendorIds: string[], userId: string | undefined) {
  const vendors = await comparisonRepository.findVendorsForComparison(vendorIds);

  if (vendors.length !== vendorIds.length) {
    throw new NotFoundError("One or more vendors were not found or are not publicly visible");
  }

  const primaryCategoryIds = new Set(
    vendors.map((v) => v.categories[0]?.categoryId).filter((id): id is string => !!id),
  );

  if (primaryCategoryIds.size === 0) {
    throw new ValidationError("The selected vendors have no primary category to compare against");
  }
  if (primaryCategoryIds.size > 1) {
    throw new ValidationError("All vendors being compared must share the same primary category");
  }

  const [categoryId] = primaryCategoryIds;
  const comparableAttributes = await comparisonRepository.findComparableAttributes(categoryId as string);

  await logAnalyticsEvent({
    userId,
    eventType: "vendor_comparison_viewed",
    metadata: { vendorIds, categoryId },
  });

  return {
    category: vendors[0]?.categories[0]?.category,
    attributes: comparableAttributes.map((attr) => ({
      id: attr.id,
      key: attr.key,
      label: attr.label,
      dataType: attr.dataType,
    })),
    vendors: vendors.map((vendor) => ({
      id: vendor.id,
      businessName: vendor.businessName,
      slug: vendor.slug,
      verificationLevel: vendor.verificationLevel,
      city: vendor.city?.name ?? null,
      startingPrice: vendor.profile?.startingPrice ?? null,
      priceRangeMin: vendor.profile?.priceRangeMin ?? null,
      priceRangeMax: vendor.profile?.priceRangeMax ?? null,
      currency: vendor.profile?.currency ?? null,
      yearsExperience: vendor.profile?.yearsExperience ?? null,
      // Rating/review-count fields intentionally omitted — no review data
      // exists until Arch Phase 10, same partial-data precedent as Arch
      // Phase 7's ranking service.
      attributeValues: Object.fromEntries(
        comparableAttributes.map((attr) => [attr.key, attributeValueFor(attr.id, vendor.attributeValues)]),
      ),
    })),
  };
}
