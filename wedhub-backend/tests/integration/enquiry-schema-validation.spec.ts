import { describe, expect, it } from "vitest";
import { createSingleVendorEnquirySchema } from "../../src/modules/enquiries/enquiry.schema";

/**
 * Item 8 #7: server-side defense-in-depth for the three real client-side
 * gaps fixed in EnquiryModal.tsx — guestCount/budget allowing zero (or
 * negative, once coerced) with no real validation, weddingDate accepting
 * any past date, and message having no required-field check at all (the
 * brief's "Message or service requirement" required-fields entry, and this
 * form collects no other service-requirement signal). Confirms a request
 * that bypasses the UI entirely (or a future API consumer) is rejected by
 * createSingleVendorEnquirySchema the same way the UI now rejects it,
 * without touching the Telegram flow, which calls
 * enquiryService.createSingleVendorEnquiry directly and never goes through
 * this Zod schema at all.
 */
describe("createSingleVendorEnquirySchema: item 8 validation tightening", () => {
  const validBase = {
    vendorId: "11111111-1111-1111-1111-111111111111",
    contactName: "Aditi Nair",
    contactEmail: "aditi@example.com",
    message: "Looking for a photographer for my wedding in Kochi.",
  };

  it("accepts a fully valid submission", () => {
    const result = createSingleVendorEnquirySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts a valid submission with guestCount/budget/weddingDate omitted (none are required)", () => {
    const result = createSingleVendorEnquirySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects guestCount of 0", () => {
    const result = createSingleVendorEnquirySchema.safeParse({ ...validBase, guestCount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative guestCount", () => {
    const result = createSingleVendorEnquirySchema.safeParse({ ...validBase, guestCount: -5 });
    expect(result.success).toBe(false);
  });

  it("accepts a positive guestCount", () => {
    const result = createSingleVendorEnquirySchema.safeParse({ ...validBase, guestCount: 150 });
    expect(result.success).toBe(true);
  });

  it("rejects a budget of 0", () => {
    const result = createSingleVendorEnquirySchema.safeParse({ ...validBase, budget: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative budget", () => {
    const result = createSingleVendorEnquirySchema.safeParse({ ...validBase, budget: -1000 });
    expect(result.success).toBe(false);
  });

  it("accepts a positive budget", () => {
    const result = createSingleVendorEnquirySchema.safeParse({ ...validBase, budget: 50000 });
    expect(result.success).toBe(true);
  });

  it("rejects a weddingDate in the past", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = createSingleVendorEnquirySchema.safeParse({
      ...validBase,
      weddingDate: yesterday.toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a weddingDate today or in the future", () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const result = createSingleVendorEnquirySchema.safeParse({
      ...validBase,
      weddingDate: nextMonth.toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing message", () => {
    const { message, ...withoutMessage } = validBase;
    const result = createSingleVendorEnquirySchema.safeParse(withoutMessage);
    expect(result.success).toBe(false);
  });

  it("rejects a blank/whitespace-only message", () => {
    const result = createSingleVendorEnquirySchema.safeParse({ ...validBase, message: "   " });
    expect(result.success).toBe(false);
  });
});
