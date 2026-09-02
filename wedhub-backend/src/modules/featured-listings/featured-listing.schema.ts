import { z } from "zod";

const PLACEMENT_TYPES = ["HOMEPAGE", "CATEGORY_PAGE", "CITY_PAGE", "SEARCH_RESULTS"] as const;
const STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED", "CANCELLED"] as const;

export const createFeaturedListingSchema = z
  .object({
    vendorId: z.string().uuid(),
    placementType: z.enum(PLACEMENT_TYPES),
    categoryId: z.string().uuid().optional(),
    cityId: z.string().uuid().optional(),
    priority: z.coerce.number().int().min(0).default(0),
    price: z.coerce.number().min(0),
    currency: z.string().length(3).default("INR"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    paymentId: z.string().uuid().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  })
  .refine((data) => data.placementType !== "CATEGORY_PAGE" || !!data.categoryId, {
    message: "categoryId is required for placementType CATEGORY_PAGE",
    path: ["categoryId"],
  })
  .refine((data) => data.placementType !== "CITY_PAGE" || !!data.cityId, {
    message: "cityId is required for placementType CITY_PAGE",
    path: ["cityId"],
  });

export const updateFeaturedListingSchema = z
  .object({
    priority: z.coerce.number().int().min(0).optional(),
    price: z.coerce.number().min(0).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(STATUSES).optional(),
    paymentId: z.string().uuid().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const listFeaturedListingsQuerySchema = z.object({
  placementType: z.enum(PLACEMENT_TYPES).optional(),
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listFeaturedListingsAdminQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  vendorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFeaturedListingBody = z.infer<typeof createFeaturedListingSchema>;
export type UpdateFeaturedListingBody = z.infer<typeof updateFeaturedListingSchema>;
export type ListFeaturedListingsQuery = z.infer<typeof listFeaturedListingsQuerySchema>;
export type ListFeaturedListingsAdminQuery = z.infer<typeof listFeaturedListingsAdminQuerySchema>;
