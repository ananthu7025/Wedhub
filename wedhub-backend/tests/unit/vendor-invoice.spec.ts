import { describe, expect, it } from "vitest";
import {
  computeGstItem,
  calculateFinancials,
  formatIndianCurrencyWords,
} from "../../src/modules/vendor-invoices/vendor-invoice.service";
import {
  createVendorInvoiceSchema,
  upsertBillingProfileSchema,
} from "../../src/modules/vendor-invoices/vendor-invoice.schema";

describe("Vendor Invoice GST Calculations", () => {
  it("computes Intra-state GST (Kerala -> Kerala) with 18% GST split into 9% CGST and 9% SGST", () => {
    const item = {
      description: "Full Wedding Photography",
      sacCode: "9983",
      quantity: 1,
      unit: "Day",
      unitPrice: 100000,
      discount: 0,
      gstRate: 18,
    };

    const isInterState = false; // Intra-state (32 -> 32)
    const computed = computeGstItem(item, isInterState, 1);

    expect(computed.taxableAmount).toBe(100000);
    expect(computed.cgstRate).toBe(9);
    expect(computed.cgstAmount).toBe(9000);
    expect(computed.sgstRate).toBe(9);
    expect(computed.sgstAmount).toBe(9000);
    expect(computed.igstRate).toBe(0);
    expect(computed.igstAmount).toBe(0);
    expect(computed.totalAmount).toBe(118000);

    const financials = calculateFinancials([computed]);
    expect(financials.subtotal).toBe(100000);
    expect(financials.taxableAmount).toBe(100000);
    expect(financials.cgstAmount).toBe(9000);
    expect(financials.sgstAmount).toBe(9000);
    expect(financials.igstAmount).toBe(0);
    expect(financials.totalTax).toBe(18000);
    expect(financials.grandTotal).toBe(118000);
    expect(financials.amountInWords).toBe("Rupees One Lakh Eighteen Thousand Only");
  });

  it("computes Inter-state GST (Kerala -> Karnataka) with 18% IGST", () => {
    const item = {
      description: "Destination Wedding Candid Videography",
      sacCode: "9983",
      quantity: 2,
      unit: "Days",
      unitPrice: 50000,
      discount: 5000,
      gstRate: 18,
    };

    const isInterState = true; // Inter-state (32 -> 29)
    const computed = computeGstItem(item, isInterState, 1);

    // Gross = 2 * 50000 = 100000, Discount = 5000 => Taxable = 95000
    expect(computed.taxableAmount).toBe(95000);
    expect(computed.cgstAmount).toBe(0);
    expect(computed.sgstAmount).toBe(0);
    expect(computed.igstRate).toBe(18);
    expect(computed.igstAmount).toBe(17100); // 95000 * 0.18
    expect(computed.totalAmount).toBe(112100); // 95000 + 17100

    const financials = calculateFinancials([computed]);
    expect(financials.subtotal).toBe(100000);
    expect(financials.totalDiscount).toBe(5000);
    expect(financials.taxableAmount).toBe(95000);
    expect(financials.igstAmount).toBe(17100);
    expect(financials.grandTotal).toBe(112100);
    expect(financials.amountInWords).toBe("Rupees One Lakh Twelve Thousand One Hundred Only");
  });

  it("computes different statutory GST tax rates (0%, 5%, 12%, 18%, 28%)", () => {
    const rates = [0, 5, 12, 18, 28];
    for (const rate of rates) {
      const computed = computeGstItem(
        { description: "Service", quantity: 1, unitPrice: 10000, discount: 0, gstRate: rate },
        false,
        1,
      );
      const expectedTax = 10000 * (rate / 100);
      expect(computed.cgstAmount + computed.sgstAmount).toBeCloseTo(expectedTax, 2);
      expect(computed.totalAmount).toBeCloseTo(10000 + expectedTax, 2);
    }
  });

  it("handles round-off correctly for fractional totals", () => {
    const item1 = computeGstItem(
      { description: "Item 1", quantity: 1, unitPrice: 100.25, discount: 0, gstRate: 18 },
      false,
      1,
    );
    // Taxable = 100.25, CGST = 9.02, SGST = 9.02, Total Tax = 18.04, Gross Total = 118.29
    const financials = calculateFinancials([item1]);
    expect(financials.grandTotal).toBe(118);
    expect(financials.roundOffAmount).toBe(-0.29);
  });
});

describe("Indian Currency Words Converter", () => {
  it("converts amounts correctly into Indian English numbering system", () => {
    expect(formatIndianCurrencyWords(0)).toBe("Rupees Zero Only");
    expect(formatIndianCurrencyWords(500)).toBe("Rupees Five Hundred Only");
    expect(formatIndianCurrencyWords(1500)).toBe("Rupees One Thousand Five Hundred Only");
    expect(formatIndianCurrencyWords(118000)).toBe("Rupees One Lakh Eighteen Thousand Only");
    expect(formatIndianCurrencyWords(45500.5)).toBe(
      "Rupees Forty Five Thousand Five Hundred and Fifty Paise Only",
    );
    expect(formatIndianCurrencyWords(12500000)).toBe(
      "Rupees One Crore Twenty Five Lakh Only",
    );
  });
});

describe("Vendor Invoice Validation Schemas", () => {
  it("validates Indian GSTIN and PAN correctly", () => {
    const validProfile = {
      legalName: "Royal Wedding Photography LLP",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      stateCode: "29",
      pincode: "560001",
    };
    expect(upsertBillingProfileSchema.safeParse(validProfile).success).toBe(true);

    const invalidGstin = {
      ...validProfile,
      gstin: "INVALID_GSTIN_123",
    };
    expect(upsertBillingProfileSchema.safeParse(invalidGstin).success).toBe(false);

    const invalidPan = {
      ...validProfile,
      pan: "12345ABCDE",
    };
    expect(upsertBillingProfileSchema.safeParse(invalidPan).success).toBe(false);
  });

  it("rejects discounts exceeding item unit price * quantity", () => {
    const invalidInvoice = {
      issueDate: "2026-09-04",
      clientName: "Rahul & Sneha",
      placeOfSupply: "Karnataka (29)",
      items: [
        {
          description: "Pre-wedding shoot",
          quantity: 1,
          unitPrice: 20000,
          discount: 25000, // Invalid: exceeds 20000
          gstRate: 18,
        },
      ],
    };
    expect(createVendorInvoiceSchema.safeParse(invalidInvoice).success).toBe(false);
  });

  it("rejects due date earlier than issue date", () => {
    const invalidInvoice = {
      issueDate: "2026-09-10",
      dueDate: "2026-09-01", // Invalid: earlier than issueDate
      clientName: "Ananya & Siddharth",
      placeOfSupply: "Kerala (32)",
      items: [
        {
          description: "Bridal Makeup",
          quantity: 1,
          unitPrice: 15000,
          discount: 0,
          gstRate: 18,
        },
      ],
    };
    expect(createVendorInvoiceSchema.safeParse(invalidInvoice).success).toBe(false);
  });
});
