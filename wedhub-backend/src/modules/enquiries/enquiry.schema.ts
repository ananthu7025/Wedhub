import { z } from "zod";

const baseFields = {
  contactName: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(6).max(20).optional(),
  preferredContactMethod: z.enum(["EMAIL", "PHONE", "WHATSAPP"]).optional(),
  weddingDate: z.coerce.date().optional(),
  weddingLocation: z.string().trim().max(300).optional(),
  serviceId: z.string().uuid().optional(),
  budget: z.coerce.number().min(0).optional(),
  guestCount: z.coerce.number().int().min(0).optional(),
  message: z.string().trim().max(2000).optional(),
};

export const createSingleVendorEnquirySchema = z.object({
  vendorId: z.string().uuid(),
  ...baseFields,
});

export const createMultiVendorEnquirySchema = z.object({
  categoryId: z.string().uuid(),
  cityId: z.string().uuid(),
  consentToShare: z.literal(true, {
    errorMap: () => ({ message: "You must explicitly agree to share this enquiry with multiple vendors" }),
  }),
  ...baseFields,
});

export type CreateSingleVendorEnquiryBody = z.infer<typeof createSingleVendorEnquirySchema>;
export type CreateMultiVendorEnquiryBody = z.infer<typeof createMultiVendorEnquirySchema>;
