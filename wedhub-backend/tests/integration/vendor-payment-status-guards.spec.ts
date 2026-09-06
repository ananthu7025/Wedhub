import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import {
  markOrderPaymentCaptured,
  createOrderRefundTx,
} from "../../src/modules/vendor-payments/vendor-payment.repository";
import { updateStoreOrderStatus } from "../../src/modules/vendor-store/vendor-store.repository";

/**
 * Proves the previously-dead isValidPaymentStatusTransition guard (see
 * vendor-payment.types.ts) is now actually invoked by the repository
 * functions that mutate paymentStatus, against a real order row — not just
 * exercised in isolation the way tests/unit/vendor-payments.spec.ts already
 * covers the pure function's own logic.
 */
describe("Payment status transition guards are wired into real mutations", () => {
  let vendorId: string;
  let storeId: string;

  beforeAll(async () => {
    const category = await prisma.category.create({
      data: {
        name: `Guard Test Category ${Date.now()}`,
        slug: `guard-test-category-${Date.now()}`,
        hasStoreEnabled: true,
        isActive: true,
      },
    });
    const vendor = await prisma.vendor.create({
      data: {
        businessName: `Guard Test Vendor ${Date.now()}`,
        slug: `guard-test-vendor-${Date.now()}`,
        status: "APPROVED",
        creationSource: "SELF_REGISTERED",
        categories: { create: [{ categoryId: category.id, isPrimary: true }] },
      },
    });
    vendorId = vendor.id;
    const store = await prisma.vendorStore.create({
      data: { vendorId: vendor.id, storeName: vendor.businessName, slug: vendor.slug },
    });
    storeId = store.id;
  });

  afterAll(async () => {
    await prisma.vendorStoreOrderRefund.deleteMany({ where: { order: { storeId } } });
    await prisma.vendorStoreOrder.deleteMany({ where: { storeId } });
    await prisma.vendorStore.deleteMany({ where: { id: storeId } });
    await prisma.vendorCategory.deleteMany({ where: { vendorId } });
    await prisma.vendor.deleteMany({ where: { id: vendorId } });
    await prisma.category.deleteMany({ where: { name: { contains: "Guard Test Category" } } });
    await prisma.$disconnect();
  });

  async function createOrder(paymentStatus: "REFUNDED" | "CANCELLED" | "PENDING", totalAmount = 1000) {
    return prisma.vendorStoreOrder.create({
      data: {
        storeId,
        orderNumber: `ORD-GUARD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        customerName: "Guard Test Customer",
        customerPhone: "9999999999",
        totalAmount,
        paymentStatus,
        orderChannel: "ONLINE",
      },
    });
  }

  it("markOrderPaymentCaptured leaves a REFUNDED order's status untouched (invalid transition, skipped not thrown)", async () => {
    const order = await createOrder("REFUNDED");

    const result = await markOrderPaymentCaptured(order.id, { razorpayPaymentId: "pay_should_not_apply" });

    expect(result.paymentStatus).toBe("REFUNDED");
    expect(result.razorpayPaymentId).not.toBe("pay_should_not_apply");
  });

  it("markOrderPaymentCaptured allows PENDING -> CAPTURED (valid transition)", async () => {
    const order = await createOrder("PENDING");

    const result = await markOrderPaymentCaptured(order.id, { razorpayPaymentId: "pay_valid_capture" });

    expect(result.paymentStatus).toBe("CAPTURED");
    expect(result.razorpayPaymentId).toBe("pay_valid_capture");
  });

  it("createOrderRefundTx rejects refunding an order that was never captured", async () => {
    const order = await createOrder("PENDING");

    await expect(
      createOrderRefundTx(order.id, { amount: 500, isFullyRefunded: false }),
    ).rejects.toThrow();
  });

  it("createOrderRefundTx allows refunding a CAPTURED order", async () => {
    const order = await createOrder("CAPTURED" as any, 1000);

    const { updatedOrder } = await createOrderRefundTx(order.id, { amount: 1000, isFullyRefunded: true });

    expect(updatedOrder.paymentStatus).toBe("REFUNDED");
  });

  it("updateStoreOrderStatus rejects an invalid manual payment status change", async () => {
    const order = await createOrder("CANCELLED");

    await expect(
      updateStoreOrderStatus(order.id, { paymentStatus: "CAPTURED" }),
    ).rejects.toThrow();
  });
});
