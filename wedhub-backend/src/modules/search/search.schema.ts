import { z } from "zod";

const SORT_OPTIONS = ["relevance", "price_low", "price_high", "newest", "recommended"] as const;

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
  sort: z.enum(SORT_OPTIONS).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchVendorsQuery = z.infer<typeof searchVendorsQuerySchema>;
export { SORT_OPTIONS };
