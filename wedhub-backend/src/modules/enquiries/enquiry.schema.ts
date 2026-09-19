import { z } from "zod";

// Item 8 #7: defense-in-depth — these mirror the client-side constraints
// EnquiryModal.tsx now enforces (weddingDate not in the past, budget a
// positive amount, guestCount at least 1 when provided), so a request that
// bypasses the UI (or a future API consumer) can't submit invalid data
// either. All three stay .optional() — none of them are in the brief's
// required-fields list, only their VALUE is constrained when present.
const weddingDateSchema = z.coerce.date().refine(
  (date) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return date >= startOfToday;
  },
  { message: "Wedding date cannot be in the past" },
);

const baseFields = {
  contactName: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(6).max(20).optional(),
  preferredContactMethod: z.enum(["EMAIL", "PHONE", "WHATSAPP"]).optional(),
  weddingDate: weddingDateSchema.optional(),
  weddingLocation: z.string().trim().max(300).optional(),
  budget: z.coerce.number().positive().optional(),
  guestCount: z.coerce.number().int().min(1).optional(),
  message: z.string().trim().max(2000).optional(),
};

export const createSingleVendorEnquirySchema = z.object({
  vendorId: z.string().uuid(),
  ...baseFields,
  // Item 8 #3/#7: the brief's required-fields list has "Message or service
  // requirement" as one combined item. This form (EnquiryModal.tsx) collects
  // no other service-requirement signal, so message is the only field that
  // can satisfy it — required here, overriding baseFields' optional version,
  // to match EnquiryModal.tsx's client-side requirement.
  //
  // Scoped to the single-vendor schema only (not baseFields itself): the
  // Telegram conversation flow (telegram.conversation.service.ts) calls
  // enquiryService.createSingleVendorEnquiry directly, bypassing this Zod
  // schema entirely, so this change has no effect there. The multi-vendor
  // schema below is left with baseFields' optional message, since no
  // frontend UI currently calls that endpoint and this task is scoped to
  // EnquiryModal.tsx's single-vendor form.
  message: z.string().trim().min(1, "Please tell the vendor what you need.").max(2000),
});

export const createMultiVendorEnquirySchema = z.object({
  categoryId: z.string().uuid(),
  cityId: z.string().uuid(),
  consentToShare: z.literal(true, {
    errorMap: () => ({ message: "You must explicitly agree to share this enquiry with multiple vendors" }),
  }),
  ...baseFields,
});

export const listMyEnquiriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateSingleVendorEnquiryBody = z.infer<typeof createSingleVendorEnquirySchema>;
export type CreateMultiVendorEnquiryBody = z.infer<typeof createMultiVendorEnquirySchema>;
export type ListMyEnquiriesQuery = z.infer<typeof listMyEnquiriesQuerySchema>;
