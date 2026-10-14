import { z } from "zod";

const BADGE_TYPES = [
  "SAVE_PERCENT",
  "FLAT_PERCENT_OFF",
  "NEW",
  "LIMITED_TIME_DEAL",
  "FREE_ADD_ON",
  "TOP_RATED",
  "CATALOG_OFFER",
] as const;

const SORT_OPTIONS = ["newest", "price_low", "price_high", "discount_high"] as const;

export const createOfferSchema = z
  .object({
    categoryId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    originalPrice: z.coerce.number().min(0),
    offerPrice: z.coerce.number().min(0),
    currency: z.string().length(3).default("INR"),
    badgeType: z.enum(BADGE_TYPES),
    discountPercent: z.coerce.number().int().min(0).max(100).nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().default(true),
    mediaIds: z.array(z.string().uuid()).max(6).optional(),
  })
  .refine((data) => data.offerPrice <= data.originalPrice, {
    message: "offerPrice must not exceed originalPrice",
    path: ["offerPrice"],
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const updateOfferSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    originalPrice: z.coerce.number().min(0).optional(),
    offerPrice: z.coerce.number().min(0).optional(),
    currency: z.string().length(3).optional(),
    badgeType: z.enum(BADGE_TYPES).optional(),
    discountPercent: z.coerce.number().int().min(0).max(100).nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
    mediaIds: z.array(z.string().uuid()).max(6).optional(),
  })
  .refine(
    (data) =>
      data.offerPrice === undefined || data.originalPrice === undefined || data.offerPrice <= data.originalPrice,
    { message: "offerPrice must not exceed originalPrice", path: ["offerPrice"] },
  )
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const listPublicOffersQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  sort: z.enum(SORT_OPTIONS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateOfferBody = z.infer<typeof createOfferSchema>;
export type UpdateOfferBody = z.infer<typeof updateOfferSchema>;
export type ListPublicOffersQuery = z.infer<typeof listPublicOffersQuerySchema>;
