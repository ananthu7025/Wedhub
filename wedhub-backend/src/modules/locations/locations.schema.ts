import { z } from "zod";

const locationType = z.enum(["COUNTRY", "STATE", "CITY", "AREA"]);

export const createLocationSchema = z.object({
  type: locationType,
  name: z.string().min(1).max(150),
  parentId: z.string().uuid().optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  isActive: z.boolean().optional(),
});

export const listLocationsQuerySchema = z.object({
  type: locationType.optional(),
  parentId: z.string().uuid().optional(),
});

export type CreateLocationBody = z.infer<typeof createLocationSchema>;
export type UpdateLocationBody = z.infer<typeof updateLocationSchema>;
export type ListLocationsQuery = z.infer<typeof listLocationsQuerySchema>;
