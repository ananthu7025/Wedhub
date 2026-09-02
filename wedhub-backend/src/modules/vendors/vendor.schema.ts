import { z } from "zod";

export const createVendorSchema = z.object({
  businessName: z.string().min(1).max(200),
});

export const updateVendorSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
});

export const upsertProfileSchema = z.object({
  shortDescription: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  vendorType: z.string().max(100).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  address: z.string().max(300).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  startingPrice: z.coerce.number().min(0).optional(),
  priceRangeMin: z.coerce.number().min(0).optional(),
  priceRangeMax: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  customQuoteAvailable: z.boolean().optional(),
  yearsExperience: z.coerce.number().int().min(0).max(100).optional(),
  teamSize: z.coerce.number().int().min(0).max(10000).optional(),
  languages: z.array(z.string().min(1).max(50)).max(20).optional(),
  travelPolicy: z.string().max(500).optional(),
  website: z.string().url().optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  businessHours: z.record(z.string(), z.string()).optional(),
  availabilityNotes: z.string().max(1000).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(300).optional(),
  canonicalUrl: z.string().url().optional(),
  cityId: z.string().uuid().optional(),
  // Nullable (not just optional) so a vendor can explicitly clear a
  // previously-set logo/cover, not just set one — omitUndefined in the
  // repository layer only strips `undefined`, so `null` passes through as a
  // real "unset this" write.
  logoMediaId: z.string().uuid().nullable().optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
});

export const setCategoriesSchema = z.object({
  primaryCategoryId: z.string().uuid(),
  subcategoryIds: z.array(z.string().uuid()).max(20).default([]),
});

export const setServiceAreasSchema = z.object({
  locationIds: z.array(z.string().uuid()).max(100),
});

export const setAttributesSchema = z.object({
  values: z
    .array(
      z.object({
        attributeId: z.string().uuid(),
        value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
      }),
    )
    .max(100),
});

export const attachServiceSchema = z.object({
  serviceId: z.string().uuid(),
  note: z.string().max(300).optional(),
});

export const createPackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).optional(),
  inclusions: z.array(z.string().min(1).max(200)).max(50).optional(),
});

export const updatePackageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  inclusions: z.array(z.string().min(1).max(200)).max(50).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const listVendorsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateVendorBody = z.infer<typeof createVendorSchema>;
export type UpdateVendorBody = z.infer<typeof updateVendorSchema>;
export type UpsertProfileBody = z.infer<typeof upsertProfileSchema>;
export type SetCategoriesBody = z.infer<typeof setCategoriesSchema>;
export type SetServiceAreasBody = z.infer<typeof setServiceAreasSchema>;
export type SetAttributesBody = z.infer<typeof setAttributesSchema>;
export type AttachServiceBody = z.infer<typeof attachServiceSchema>;
export type CreatePackageBody = z.infer<typeof createPackageSchema>;
export type UpdatePackageBody = z.infer<typeof updatePackageSchema>;
export type ListVendorsQuery = z.infer<typeof listVendorsQuerySchema>;
