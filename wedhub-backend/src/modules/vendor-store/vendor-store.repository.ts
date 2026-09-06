import { prisma } from "../../config/database";
import { Prisma, type StoreItemType, type StoreOrderStatus, type StorePaymentStatus } from "@prisma/client";
import { omitUndefined } from "../../common/utils/object.util";
import { ValidationError } from "../../common/errors";
import { isValidPaymentStatusTransition } from "../vendor-payments/vendor-payment.types";

export async function checkVendorStoreEligibility(vendorId: string): Promise<boolean> {
  const vendorCategories = await prisma.vendorCategory.findMany({
    where: { vendorId },
    include: { category: true },
  });

  return vendorCategories.some((vc) => vc.category.isActive && vc.category.hasStoreEnabled);
}

export function findVendorStoreByVendorId(vendorId: string) {
  return prisma.vendorStore.findUnique({
    where: { vendorId },
    include: {
      _count: {
        select: {
          items: true,
          orders: true,
        },
      },
    },
  });
}

export function findVendorStoreBySlug(slug: string) {
  return prisma.vendorStore.findUnique({
    where: { slug },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          status: true,
          profile: {
            select: {
              address: true,
              phone: true,
              email: true,
              logoMediaId: true,
              coverMediaId: true,
              logoMedia: {
                select: {
                  thumbnailObjectKey: true,
                  originalObjectKey: true,
                },
              },
              coverMedia: {
                select: {
                  optimizedObjectKey: true,
                  originalObjectKey: true,
                },
              },
            },
          },
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  hasStoreEnabled: true,
                  isActive: true,
                },
              },
            },
          },
          paymentAccount: true,
        },
      },
    },
  });
}


export async function upsertVendorStore(
  vendorId: string,
  data: {
    storeName?: string | undefined;
    slug?: string | undefined;
    tagline?: string | null | undefined;
    aboutStore?: string | null | undefined;
    isEnabled?: boolean | undefined;
    whatsappOrderPhone?: string | null | undefined;
    shippingPolicy?: string | null | undefined;
    returnPolicy?: string | null | undefined;
    minOrderValue?: number | null | undefined;
  },
  defaultName: string,
  defaultSlug: string,
) {
  const fields = omitUndefined(data);
  return prisma.vendorStore.upsert({
    where: { vendorId },
    create: {
      vendorId,
      storeName: data.storeName ?? defaultName,
      slug: data.slug ?? defaultSlug,
      ...fields,
    },
    update: fields,
  });
}

export function findStoreItems(storeId: string, includeInactive = false) {
  return prisma.vendorStoreItem.findMany({
    where: {
      storeId,
      ...(includeInactive ? {} : { isAvailable: true }),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      media: {
        include: {
          media: {
            select: {
              id: true,
              originalObjectKey: true,
              optimizedObjectKey: true,
              thumbnailObjectKey: true,
              moderationStatus: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export function findStoreItemById(id: string) {
  return prisma.vendorStoreItem.findUnique({
    where: { id },
    include: {
      store: true,
      media: {
        include: {
          media: {
            select: {
              id: true,
              originalObjectKey: true,
              optimizedObjectKey: true,
              thumbnailObjectKey: true,
              moderationStatus: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createStoreItem(
  storeId: string,
  data: {
    title: string;
    slug: string;
    description?: string | null | undefined;
    itemType: StoreItemType;
    price: number;
    compareAtPrice?: number | null | undefined;
    gstRate: number;
    minOrderQuantity: number;
    stockQuantity?: number | null | undefined;
    isAvailable: boolean;
    tags: string[];
    mediaIds?: string[] | undefined;
  },
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.vendorStoreItem.create({
      data: {
        storeId,
        title: data.title,
        slug: data.slug,
        description: data.description ?? null,
        itemType: data.itemType,
        price: new Prisma.Decimal(data.price),
        compareAtPrice: data.compareAtPrice ? new Prisma.Decimal(data.compareAtPrice) : null,
        gstRate: data.gstRate,
        minOrderQuantity: data.minOrderQuantity,
        stockQuantity: data.stockQuantity ?? null,
        isAvailable: data.isAvailable,
        tags: data.tags,
      },
    });

    if (data.mediaIds && data.mediaIds.length > 0) {
      await tx.vendorStoreItemMedia.createMany({
        data: data.mediaIds.map((mediaId, index) => ({
          itemId: item.id,
          mediaId,
          sortOrder: index,
        })),
      });
    }

    return item;
  });
}

export async function updateStoreItem(
  id: string,
  data: {
    title?: string | undefined;
    description?: string | null | undefined;
    itemType?: StoreItemType | undefined;
    price?: number | undefined;
    compareAtPrice?: number | null | undefined;
    gstRate?: number | undefined;
    minOrderQuantity?: number | undefined;
    stockQuantity?: number | null | undefined;
    isAvailable?: boolean | undefined;
    tags?: string[] | undefined;
    mediaIds?: string[] | undefined;
  },
) {
  return prisma.$transaction(async (tx) => {
    const fields: Prisma.VendorStoreItemUpdateInput = {};
    if (data.title !== undefined) fields.title = data.title;
    if (data.description !== undefined) fields.description = data.description;
    if (data.itemType !== undefined) fields.itemType = data.itemType;
    if (data.price !== undefined) fields.price = new Prisma.Decimal(data.price);
    if (data.compareAtPrice !== undefined)
      fields.compareAtPrice = data.compareAtPrice ? new Prisma.Decimal(data.compareAtPrice) : null;
    if (data.gstRate !== undefined) fields.gstRate = data.gstRate;
    if (data.minOrderQuantity !== undefined) fields.minOrderQuantity = data.minOrderQuantity;
    if (data.stockQuantity !== undefined) fields.stockQuantity = data.stockQuantity;
    if (data.isAvailable !== undefined) fields.isAvailable = data.isAvailable;
    if (data.tags !== undefined) fields.tags = data.tags;

    const item = await tx.vendorStoreItem.update({
      where: { id },
      data: fields,
    });

    if (data.mediaIds !== undefined) {
      await tx.vendorStoreItemMedia.deleteMany({ where: { itemId: id } });
      if (data.mediaIds.length > 0) {
        await tx.vendorStoreItemMedia.createMany({
          data: data.mediaIds.map((mediaId, index) => ({
            itemId: id,
            mediaId,
            sortOrder: index,
          })),
        });
      }
    }

    return item;
  });
}

export function deleteStoreItem(id: string) {
  return prisma.vendorStoreItem.delete({ where: { id } });
}

export async function createStoreOrderAtomicTx(
  storeId: string,
  orderData: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null | undefined;
    shippingAddress?: string | null | undefined;
    city?: string | null | undefined;
    customerState?: string | null | undefined;
    pincode?: string | null | undefined;
    eventDate?: Date | null | undefined;
    notes?: string | null | undefined;
    subtotal?: number | undefined;
    discount?: number | undefined;
    gstAmount?: number | undefined;
    totalAmount: number;
    orderChannel?: string | undefined;
    paymentStatus?: "CREATED" | "PENDING" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED" | undefined;
    paymentProvider?: string | undefined;
    razorpayOrderId?: string | null | undefined;
    vendorPaymentAccountId?: string | null | undefined;
    platformCommission?: number | undefined;
    gatewayFee?: number | undefined;
    estimatedGatewayFee?: number | undefined;
    actualGatewayFee?: number | null | undefined;
    vendorSettlementAmount?: number | undefined;
  },
  orderItems: Array<{
    itemId: string;
    itemTitle: string;
    unitPrice: number;
    gstRate: number;
    quantity: number;
    totalPrice: number;
    customizationNotes?: string | null | undefined;
  }>,
) {
  return prisma.$transaction(async (tx) => {
    // Atomically reserve stock for every line item. The WHERE guard
    // (stockQuantity IS NULL OR stockQuantity >= quantity) and the
    // decrement are evaluated by Postgres as a single row operation, so two
    // concurrent transactions checking out the same last unit cannot both
    // pass — whichever commits first wins the row, the second's updateMany
    // affects 0 rows and throws. This replaces a previous read-then-throw
    // check that raced under concurrent checkouts.
    for (const oi of orderItems) {
      // Unlimited-stock items (stockQuantity === null) skip the decrement
      // entirely — Prisma's `decrement` cannot be applied to a null field,
      // and there is nothing to reserve for a made-to-order item.
      const limitedStock = await tx.vendorStoreItem.findUnique({
        where: { id: oi.itemId },
        select: { stockQuantity: true },
      });
      if (!limitedStock) {
        throw new ValidationError(`Item "${oi.itemTitle}" is no longer available.`);
      }
      if (limitedStock.stockQuantity === null) continue;

      const result = await tx.vendorStoreItem.updateMany({
        where: { id: oi.itemId, stockQuantity: { gte: oi.quantity } },
        data: { stockQuantity: { decrement: oi.quantity } },
      });

      if (result.count === 0) {
        const storeItem = await tx.vendorStoreItem.findUnique({ where: { id: oi.itemId } });
        throw new ValidationError(
          `Item "${oi.itemTitle}" has only ${storeItem?.stockQuantity ?? 0} in stock. Please adjust quantity.`,
        );
      }

      const afterDecrement = await tx.vendorStoreItem.findUnique({
        where: { id: oi.itemId },
        select: { stockQuantity: true },
      });
      if (afterDecrement?.stockQuantity === 0) {
        await tx.vendorStoreItem.update({ where: { id: oi.itemId }, data: { isAvailable: false } });
      }
    }

    const updatedStore = await tx.vendorStore.update({
      where: { id: storeId },
      data: { nextOrderNumber: { increment: 1 } },
      select: { nextOrderNumber: true },
    });

    const year = new Date().getFullYear();
    const orderNumber = `ORD-${year}-${String(updatedStore.nextOrderNumber).padStart(4, "0")}`;

    const order = await tx.vendorStoreOrder.create({
      data: {
        orderNumber,
        storeId,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail ?? null,
        shippingAddress: orderData.shippingAddress ?? null,
        city: orderData.city ?? null,
        customerState: orderData.customerState ?? null,
        pincode: orderData.pincode ?? null,
        eventDate: orderData.eventDate ?? null,
        notes: orderData.notes ?? null,
        subtotal: new Prisma.Decimal(orderData.subtotal ?? orderData.totalAmount),
        discount: new Prisma.Decimal(orderData.discount ?? 0),
        gstAmount: new Prisma.Decimal(orderData.gstAmount ?? 0),
        totalAmount: new Prisma.Decimal(orderData.totalAmount),
        status: "PENDING_CONFIRMATION",
        orderChannel: orderData.orderChannel || "WHATSAPP",
        paymentStatus: orderData.paymentStatus || "PENDING",
        paymentProvider: orderData.paymentProvider || "razorpay",
        razorpayOrderId: orderData.razorpayOrderId ?? null,
        vendorPaymentAccountId: orderData.vendorPaymentAccountId ?? null,
        platformCommission: new Prisma.Decimal(orderData.platformCommission ?? 0),
        gatewayFee: new Prisma.Decimal(orderData.gatewayFee ?? 0),
        estimatedGatewayFee: new Prisma.Decimal(orderData.estimatedGatewayFee ?? orderData.gatewayFee ?? 0),
        actualGatewayFee: orderData.actualGatewayFee ? new Prisma.Decimal(orderData.actualGatewayFee) : null,
        vendorSettlementAmount: orderData.vendorSettlementAmount
          ? new Prisma.Decimal(orderData.vendorSettlementAmount)
          : null,
        items: {
          create: orderItems.map((oi) => ({
            itemId: oi.itemId,
            itemTitle: oi.itemTitle,
            unitPrice: new Prisma.Decimal(oi.unitPrice),
            gstRate: oi.gstRate,
            quantity: oi.quantity,
            totalPrice: new Prisma.Decimal(oi.totalPrice),
            customizationNotes: oi.customizationNotes ?? null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  });
}

/**
 * Reverses the stock reserved by createStoreOrderAtomicTx for an order that
 * never completed (Razorpay order-creation failure, or a stale/timed-out
 * checkout). Stock is decremented at order-creation time (not at payment
 * capture), so every path that cancels an order before payment must restore
 * it here or inventory permanently leaks.
 */
export async function restoreStockForOrder(orderId: string) {
  const order = await prisma.vendorStoreOrder.findUnique({
    where: { id: orderId },
    select: { items: { select: { itemId: true, quantity: true } } },
  });
  if (!order) return;

  await prisma.$transaction(
    order.items
      .filter((oi) => oi.itemId)
      .map((oi) =>
        prisma.vendorStoreItem.updateMany({
          where: { id: oi.itemId! },
          data: { stockQuantity: { increment: oi.quantity }, isAvailable: true },
        }),
      ),
  );
}

/**
 * Marks an ONLINE order FAILED/CANCELLED after Razorpay order-creation
 * throws, restoring the stock reserved for it. Guarded on the order still
 * being PENDING so a retried/duplicate call can't stomp a state a webhook
 * has already advanced past.
 */
export async function markOrderRazorpayFailed(orderId: string) {
  const result = await prisma.vendorStoreOrder.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED", status: "CANCELLED" },
  });
  if (result.count > 0) {
    await restoreStockForOrder(orderId);
  }
  return result;
}

/** Attaches the Razorpay order id once gateway order-creation succeeds. */
export function attachRazorpayOrderId(orderId: string, razorpayOrderId: string) {
  return prisma.vendorStoreOrder.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: { razorpayOrderId },
  });
}

export function findStoreOrders(storeId: string, status?: StoreOrderStatus) {
  return prisma.vendorStoreOrder.findMany({
    where: {
      storeId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      refunds: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          grandTotal: true,
        },
      },
    },
  });
}


export function findStoreOrderById(id: string) {
  return prisma.vendorStoreOrder.findUnique({
    where: { id },
    include: {
      store: {
        include: {
          vendor: {
            include: {
              billingProfile: true,
            },
          },
        },
      },
      items: true,
      invoice: true,
    },
  });
}

export async function updateStoreOrderStatus(
  id: string,
  data: {
    status?: StoreOrderStatus | undefined;
    paymentStatus?: StorePaymentStatus | undefined;
  },
) {
  if (data.paymentStatus !== undefined) {
    const current = await prisma.vendorStoreOrder.findUnique({ where: { id }, select: { paymentStatus: true } });
    if (current && !isValidPaymentStatusTransition(current.paymentStatus, data.paymentStatus)) {
      throw new ValidationError(
        `Cannot change payment status from ${current.paymentStatus} to ${data.paymentStatus}.`,
      );
    }
  }

  const updateData: Prisma.VendorStoreOrderUpdateInput = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;

  return prisma.vendorStoreOrder.update({
    where: { id },
    data: updateData,
    include: {
      items: true,
      invoice: true,
    },
  });
}

export function linkOrderInvoice(orderId: string, invoiceId: string) {
  return prisma.vendorStoreOrder.update({
    where: { id: orderId },
    data: { invoiceId },
  });
}

/**
 * Cancels ONLINE orders whose checkout session has been PENDING too long,
 * restoring the stock reserved for each (stock is decremented atomically at
 * order-creation time — see createStoreOrderAtomicTx — so an abandoned
 * checkout must give it back or inventory permanently leaks). This is the
 * single canonical implementation — vendor-store domain owns
 * VendorStoreOrder, so admin-store-payments imports and calls this rather
 * than keeping its own copy.
 */
export async function cleanupStalePendingOrders(olderThanMinutes: number = 60) {
  const threshold = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const staleOrders = await prisma.vendorStoreOrder.findMany({
    where: {
      orderChannel: "ONLINE",
      paymentStatus: "PENDING",
      createdAt: { lt: threshold },
    },
    select: { id: true },
  });

  if (staleOrders.length === 0) {
    return { count: 0 };
  }

  const orderIds = staleOrders.map((o) => o.id);

  await prisma.vendorStorePaymentAttempt.updateMany({
    where: {
      orderId: { in: orderIds },
      status: "PENDING",
    },
    data: {
      status: "FAILED",
      failureCode: "SESSION_EXPIRED",
      failureReason: "Checkout session expired after inactivity",
      failedAt: new Date(),
    },
  });

  const result = await prisma.vendorStoreOrder.updateMany({
    where: {
      id: { in: orderIds },
    },
    data: {
      paymentStatus: "CANCELLED",
      status: "CANCELLED",
      notes: "Order cancelled automatically due to payment session timeout.",
    },
  });

  for (const orderId of orderIds) {
    await restoreStockForOrder(orderId);
  }

  return result;
}
