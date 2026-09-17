import { z } from "zod";

const SORT_OPTIONS = ["relevance", "price_low", "price_high", "newest", "recommended", "fastest_reply"] as const;

export const searchVendorsQuerySchema = z.object({
  keyword: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  serviceAreaId: z.string().uuid().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  verified: z.coerce.boolean().optional(),
  // Category-attribute filters as attr[<attributeId>]=<value>, e.g.
  // ?attr[a1b2...]=outdoor. Express's default "extended" query parser (qs)
  // turns that into { a1b2...: "outdoor" } here; values are matched as
  // strings regardless of the attribute's underlying dataType.
  attr: z.record(z.string().uuid(), z.string().min(1).max(200)).optional(),
  // Item 4: coarse "replies within N hours" filter, in whole hours from the
  // UI — converted to milliseconds for the repository/Vendor.avgResponseTimeMs
  // comparison. Capped at 30 days (720h); the underlying signal is meant to
  // separate "fast" from "slow" vendors, not model arbitrarily long windows.
  maxReplyHours: z.coerce.number().min(1).max(720).optional(),
  sort: z.enum(SORT_OPTIONS).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchVendorsQuery = z.infer<typeof searchVendorsQuerySchema>;
export { SORT_OPTIONS };
