import { z } from "zod";

const TEMPLATES = ["ROYAL_WEDDING", "MINIMAL_ELEGANT", "TRADITIONAL_INDIAN"] as const;

export const createWeddingWebsiteSchema = z.object({
  template: z.enum(TEMPLATES).default("ROYAL_WEDDING"),
  brideName: z.string().min(1).max(150),
  groomName: z.string().min(1).max(150),
});

export const updateWeddingWebsiteSchema = z.object({
  template: z.enum(TEMPLATES).optional(),
  brideName: z.string().min(1).max(150).optional(),
  groomName: z.string().min(1).max(150).optional(),
  weddingDate: z.coerce.date().optional(),
  weddingTime: z.string().max(50).optional(),
  venueName: z.string().max(200).optional(),
  venueAddress: z.string().max(500).optional(),
  googleMapsUrl: z.string().url().max(1000).optional(),
  shortDescription: z.string().max(500).optional(),
  brideParents: z.string().max(200).optional(),
  groomParents: z.string().max(200).optional(),
  weddingHashtag: z.string().max(100).optional(),
  contactInfo: z.string().max(300).optional(),
  socialLinks: z.record(z.string(), z.string().url()).optional(),
  coupleStory: z.string().max(3000).optional(),
  brideDescription: z.string().max(1000).optional(),
  groomDescription: z.string().max(1000).optional(),
  howWeMet: z.string().max(1000).optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
  couplePhotoMediaId: z.string().uuid().nullable().optional(),
});

export const createWeddingWebsiteEventSchema = z.object({
  name: z.string().min(1).max(150),
  date: z.coerce.date().optional(),
  time: z.string().max(50).optional(),
  venue: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
});

export const updateWeddingWebsiteEventSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  date: z.coerce.date().nullable().optional(),
  time: z.string().max(50).nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const listAdminWeddingWebsitesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const submitRsvpSchema = z.object({
  name: z.string().min(1).max(150),
  attending: z.enum(["YES", "NO", "MAYBE"]),
  guestCount: z.coerce.number().int().min(0).max(50).optional(),
  message: z.string().max(1000).optional(),
});

export type CreateWeddingWebsiteBody = z.infer<typeof createWeddingWebsiteSchema>;
export type UpdateWeddingWebsiteBody = z.infer<typeof updateWeddingWebsiteSchema>;
export type CreateWeddingWebsiteEventBody = z.infer<typeof createWeddingWebsiteEventSchema>;
export type UpdateWeddingWebsiteEventBody = z.infer<typeof updateWeddingWebsiteEventSchema>;
export type SubmitRsvpBody = z.infer<typeof submitRsvpSchema>;
export type ListAdminWeddingWebsitesQuery = z.infer<typeof listAdminWeddingWebsitesQuerySchema>;

export { TEMPLATES };
