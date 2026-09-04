import { prisma } from "../../config/database";
import { Prisma, type StoreItemType, type StoreOrderStatus } from "@prisma/client";
import { omitUndefined } from "../../common/utils/object.util";

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
    totalAmount: number;
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
        totalAmount: new Prisma.Decimal(orderData.totalAmount),
        status: "PENDING_CONFIRMATION",
        orderChannel: "WHATSAPP",
        paymentStatus: "PENDING",
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

export function findStoreOrders(storeId: string, status?: StoreOrderStatus) {
  return prisma.vendorStoreOrder.findMany({
    where: {
      storeId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
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

export function updateStoreOrderStatus(
  id: string,
  data: {
    status?: StoreOrderStatus | undefined;
    paymentStatus?: string | undefined;
  },
) {
  return prisma.vendorStoreOrder.update({
    where: { id },
    data: omitUndefined(data),
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
