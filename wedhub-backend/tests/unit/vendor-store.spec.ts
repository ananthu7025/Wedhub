import { describe, expect, it } from "vitest";
import {
  createStoreItemSchema,
  publicCreateOrderSchema,
  upsertStoreProfileSchema,
} from "../../src/modules/vendor-store/vendor-store.schema";

describe("Vendor Store Schemas & Order Validation", () => {
  it("validates store item creation with valid payload", () => {
    const valid = {
      title: "Handcrafted Bridal Garland Set",
      description: "Fresh jasmine and rose garlands for wedding ceremony",
      itemType: "PHYSICAL_PRODUCT",
      price: 3500,
      compareAtPrice: 4200,
      gstRate: 5,
      minOrderQuantity: 1,
      stockQuantity: 25,
      isAvailable: true,
      tags: ["floral", "garland", "ceremony"],
    };

    const parsed = createStoreItemSchema.parse(valid);
    expect(parsed.title).toBe("Handcrafted Bridal Garland Set");
    expect(parsed.price).toBe(3500);
    expect(parsed.gstRate).toBe(5);
  });

  it("fails store item creation when price is negative", () => {
    const invalid = {
      title: "Wedding Gift Box",
      price: -50,
      gstRate: 18,
    };

    expect(() => createStoreItemSchema.parse(invalid)).toThrow();
  });

  it("validates upsert store profile schema", () => {
    const profile = {
      storeName: "Aiswarya Floral Boutique",
      tagline: "Finest fresh wedding flowers in Kochi",
      aboutStore: "Serving weddings across Kerala with custom floral arrangements since 2018.",
      isEnabled: true,
      whatsappOrderPhone: "+91 98765 43210",
      shippingPolicy: "Same day delivery in Ernakulam district. Outstation orders ship via refrigerated courier.",
      returnPolicy: "Perishable items cannot be returned once delivered.",
      minOrderValue: 1000,
    };

    const parsed = upsertStoreProfileSchema.parse(profile);
    expect(parsed.storeName).toBe("Aiswarya Floral Boutique");
    expect(parsed.minOrderValue).toBe(1000);
  });

  it("validates public order placement schema with items and contact details", () => {
    const order = {
      customerName: "Anjali Menon",
      customerPhone: "9876543210",
      customerEmail: "anjali@example.com",
      shippingAddress: "Flat 4B, Skyview Towers, Marine Drive",
      city: "Kochi",
      customerState: "Kerala",
      pincode: "682011",
      eventDate: "2026-11-20T00:00:00.000Z",
      notes: "Need delivery before 7:00 AM on the wedding morning",
      items: [
        {
          itemId: "11111111-1111-1111-1111-111111111111",
          quantity: 2,
          customizationNotes: "White and baby pink theme",
        },
      ],
    };

    const parsed = publicCreateOrderSchema.parse(order);
    expect(parsed.customerName).toBe("Anjali Menon");
    expect(parsed.customerPhone).toBe("9876543210");
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].quantity).toBe(2);
  });

  it("rejects order with empty items array", () => {
    const emptyItemsOrder = {
      customerName: "Rahul",
      customerPhone: "9876543210",
      items: [],
    };

    expect(() => publicCreateOrderSchema.parse(emptyItemsOrder)).toThrow();
  });
});
