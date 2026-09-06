import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import { createStoreOrderAtomicTx } from "../../src/modules/vendor-store/vendor-store.repository";

/**
 * Proves the atomic stock-decrement fix in createStoreOrderAtomicTx against
 * a real Postgres instance (not a mock) — two concurrent checkouts racing
 * for the same last unit of stock must resolve to exactly one success and
 * one rejection, never both succeeding (which would oversell) and never
 * both failing. Requires DATABASE_URL loaded (see package.json's
 * test:integration script, which runs via `node --env-file=.env`) and a
 * live Postgres reachable at that URL.
 */
describe("Vendor store checkout — atomic stock decrement under concurrency", () => {
  let vendorId: string;
  let storeId: string;
  let itemId: string;

  beforeAll(async () => {
    const category = await prisma.category.create({
      data: {
        name: `Concurrency Test Category ${Date.now()}`,
        slug: `concurrency-test-category-${Date.now()}`,
        hasStoreEnabled: true,
        isActive: true,
      },
    });

    const vendor = await prisma.vendor.create({
      data: {
        businessName: `Concurrency Test Vendor ${Date.now()}`,
        slug: `concurrency-test-vendor-${Date.now()}`,
        status: "APPROVED",
        creationSource: "SELF_REGISTERED",
        categories: { create: [{ categoryId: category.id, isPrimary: true }] },
      },
    });
    vendorId = vendor.id;

    const store = await prisma.vendorStore.create({
      data: {
        vendorId: vendor.id,
        storeName: vendor.businessName,
        slug: vendor.slug,
      },
    });
    storeId = store.id;

    const item = await prisma.vendorStoreItem.create({
      data: {
        storeId: store.id,
        title: "Last Unit Test Item",
        slug: "last-unit-test-item",
        price: 500,
        gstRate: 0,
        stockQuantity: 1,
        isAvailable: true,
      },
    });
    itemId = item.id;
  });

  afterAll(async () => {
    await prisma.vendorStoreOrder.deleteMany({ where: { storeId } });
    await prisma.vendorStoreItem.deleteMany({ where: { storeId } });
    await prisma.vendorStore.deleteMany({ where: { id: storeId } });
    await prisma.vendorCategory.deleteMany({ where: { vendorId } });
    await prisma.vendor.deleteMany({ where: { id: vendorId } });
    await prisma.category.deleteMany({ where: { hasStoreEnabled: true, name: { contains: "Concurrency Test Category" } } });
    await prisma.$disconnect();
  });

  it("allows exactly one of two simultaneous checkouts for the last unit to succeed", async () => {
    const orderItems = [
      {
        itemId,
        itemTitle: "Last Unit Test Item",
        unitPrice: 500,
        gstRate: 0,
        quantity: 1,
        totalPrice: 500,
      },
    ];

    const attempt = () =>
      createStoreOrderAtomicTx(
        storeId,
        {
          customerName: "Concurrent Customer",
          customerPhone: "9999999999",
          totalAmount: 500,
        },
        orderItems,
      );

    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const finalItem = await prisma.vendorStoreItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(finalItem.stockQuantity).toBe(0);
    expect(finalItem.isAvailable).toBe(false);
  });
});
