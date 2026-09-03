import { z } from "zod";

const pageTypeEnum = z.enum(["CATEGORY", "CITY", "CATEGORY_CITY"]);

export const getSeoPageQuerySchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    cityId: z.string().uuid().optional(),
  })
  .refine((data) => data.categoryId ?? data.cityId, {
    message: "At least one of categoryId or cityId is required",
  });

export const listSeoOverridesQuerySchema = z.object({
  pageType: pageTypeEnum.optional(),
});

export const createSeoOverrideSchema = z
  .object({
    pageType: pageTypeEnum,
    categoryId: z.string().uuid().optional(),
    cityId: z.string().uuid().optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(500).optional(),
    ogImageUrl: z.string().url().optional(),
    noIndex: z.boolean().optional(),
  })
  .refine((data) => (data.pageType === "CATEGORY" ? !!data.categoryId && !data.cityId : true), {
    message: "pageType CATEGORY requires categoryId and no cityId",
  })
  .refine((data) => (data.pageType === "CITY" ? !!data.cityId && !data.categoryId : true), {
    message: "pageType CITY requires cityId and no categoryId",
  })
  .refine((data) => (data.pageType === "CATEGORY_CITY" ? !!data.categoryId && !!data.cityId : true), {
    message: "pageType CATEGORY_CITY requires both categoryId and cityId",
  });

export const updateSeoOverrideSchema = z.object({
  title: z.string().min(1).max(200).nullable().optional(),
  description: z.string().min(1).max(500).nullable().optional(),
  ogImageUrl: z.string().url().nullable().optional(),
  noIndex: z.boolean().optional(),
});

export type GetSeoPageQuery = z.infer<typeof getSeoPageQuerySchema>;
export type ListSeoOverridesQuery = z.infer<typeof listSeoOverridesQuerySchema>;
export type CreateSeoOverrideBody = z.infer<typeof createSeoOverrideSchema>;
export type UpdateSeoOverrideBody = z.infer<typeof updateSeoOverrideSchema>;
