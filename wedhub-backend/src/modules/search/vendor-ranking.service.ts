// Vendor ranking (product.md §11): organic relevance + quality score + business
// visibility score. Computed in-application over the current search-result page
// rather than in SQL, since the inputs mix a Postgres similarity score with
// business rules that don't belong in a query.
//
// Signals NOT yet available are intentionally left out rather than faked:
// review rating/quality and response rate/time/lead conversion need Arch
// Phase 10 (Reviews) and Arch Phase 9 (Enquiries/Leads) data respectively.
// Distance needs a real geo query, not yet wired to search filters. This
// mirrors Arch Phase 5's precedent of a deliberately partial
// profileCompleteness formula pending later phases' data — noted here so
// it isn't mistaken for an oversight.
//
// businessVisibility WAS the one deliberately-zero placeholder here pending
// a real subscription signal — filled in 2026-09-22 (see
// PLAN-2026-09-22-premium-feature-buildout.md §4) using featured_eligibility
// as the "Premium vendor" cohort, the same reuse decision as the badge/
// lead-auto-unlock features rather than a new near-identical entitlement key.

export interface RankableVendor {
  id: string;
  profileCompleteness: number;
  verificationLevel: string;
  categoryMatch: boolean;
  cityMatch: boolean;
  similarity: number; // 0..1, from Postgres trigram/full-text similarity, 0 when no keyword given
  // plan.features.featured_eligibility, batch-resolved by the caller.
  // Optional (defaults to false in computeRankingScore) so rankVendors'
  // other callers (matching.service.ts, telegram.conversation.service.ts,
  // enquiry.service.ts's multi-vendor selection) aren't forced to batch-
  // fetch entitlement data they don't need — only search.service.ts's
  // sort=recommended path currently resolves and passes this.
  isPremiumEligible?: boolean;
}

const VERIFICATION_WEIGHT: Record<string, number> = {
  UNVERIFIED: 0,
  IDENTITY_VERIFIED: 0.25,
  BUSINESS_VERIFIED: 0.6,
  PLATFORM_VERIFIED: 1,
};

export function computeRankingScore(vendor: RankableVendor): number {
  const relevance = vendor.similarity * 0.5 + (vendor.categoryMatch ? 0.3 : 0) + (vendor.cityMatch ? 0.2 : 0);
  const quality = (vendor.profileCompleteness / 100) * 0.6 + (VERIFICATION_WEIGHT[vendor.verificationLevel] ?? 0) * 0.4;
  const businessVisibility = vendor.isPremiumEligible === true ? 1 : 0;

  // Organic relevance dominates; subscription/visibility is deliberately
  // capped as a minority signal per product.md §11 ("controlled ranking
  // signal, not the sole ranking mechanism") — this weighting was fixed
  // before businessVisibility had a real value, and stays unchanged now
  // that it does, exactly per the comment that used to sit here.
  return relevance * 0.6 + quality * 0.3 + businessVisibility * 0.1;
}

export function rankVendors<T extends RankableVendor>(vendors: T[]): T[] {
  return [...vendors].sort((a, b) => computeRankingScore(b) - computeRankingScore(a));
}
