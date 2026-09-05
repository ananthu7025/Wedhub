import { NotFoundError, ValidationError } from "../../common/errors";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import { getPublicUrl } from "../../integrations/storage/r2.client";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import { prisma } from "../../config/database";
import * as storeRepository from "./vendor-store.repository";
import * as vendorInvoiceService from "../vendor-invoices/vendor-invoice.service";
import * as vendorPaymentService from "../vendor-payments/vendor-payment.service";
import type {
  CreateStoreItemInput,
  PublicCreateOrderInput,
  UpdateOrderStatusInput,
  UpdateStoreItemInput,
  UpsertStoreProfileInput,
} from "./vendor-store.types";
import type { StoreOrderStatus } from "@prisma/client";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

type StoreItemWithMedia = Awaited<ReturnType<typeof storeRepository.findStoreItems>>[number];

export async function getVendorStoreProfile(userId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const isEligible = await storeRepository.checkVendorStoreEligibility(vendor.id);
  const existingStore = await storeRepository.findVendorStoreByVendorId(vendor.id);

  if (!existingStore) {
    return {
      id: null,
      vendorId: vendor.id,
      storeName: vendor.businessName,
      slug: vendor.slug,
      tagline: null,
      aboutStore: null,
      isEnabled: true,
      currency: "INR",
      whatsappOrderPhone: vendor.profile?.phone ?? null,
      shippingPolicy: null,
      returnPolicy: null,
      minOrderValue: null,
      isEligible,
      itemCount: 0,
      orderCount: 0,
    };
  }

  return {
    id: existingStore.id,
    vendorId: existingStore.vendorId,
    storeName: existingStore.storeName,
    slug: existingStore.slug,
    tagline: existingStore.tagline,
    aboutStore: existingStore.aboutStore,
    isEnabled: existingStore.isEnabled,
    currency: existingStore.currency,
    whatsappOrderPhone: existingStore.whatsappOrderPhone,
    shippingPolicy: existingStore.shippingPolicy,
    returnPolicy: existingStore.returnPolicy,
    minOrderValue: existingStore.minOrderValue ? Number(existingStore.minOrderValue) : null,
    isEligible,
    itemCount: existingStore._count.items,
    orderCount: existingStore._count.orders,
  };
}

export async function updateVendorStoreProfile(userId: string, input: UpsertStoreProfileInput) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const isEligible = await storeRepository.checkVendorStoreEligibility(vendor.id);

  if (!isEligible) {
    throw new ValidationError(
      "Your vendor category is not currently eligible for a vendor store. Contact admin to enable store for your category.",
    );
  }

  return storeRepository.upsertVendorStore(
    vendor.id,
    {
      storeName: input.storeName,
      tagline: input.tagline,
      aboutStore: input.aboutStore,
      isEnabled: input.isEnabled,
      whatsappOrderPhone: input.whatsappOrderPhone ? normalizePhone(input.whatsappOrderPhone) : input.whatsappOrderPhone,
      shippingPolicy: input.shippingPolicy,
      returnPolicy: input.returnPolicy,
      minOrderValue: input.minOrderValue,
    },
    vendor.businessName,
    vendor.slug,
  );
}

function formatItemMedia(item: StoreItemWithMedia) {
  return {
    id: item.id,
    storeId: item.storeId,
    title: item.title,
    slug: item.slug,
    description: item.description,
    itemType: item.itemType,
    price: Number(item.price),
    compareAtPrice: item.compareAtPrice ? Number(item.compareAtPrice) : null,
    gstRate: item.gstRate,
    minOrderQuantity: item.minOrderQuantity,
    stockQuantity: item.stockQuantity,
    isAvailable: item.isAvailable,
    tags: item.tags,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    media: item.media.map((m) => ({
      id: m.id,
      mediaId: m.mediaId,
      sortOrder: m.sortOrder,
      url: m.media.optimizedObjectKey
        ? getPublicUrl(m.media.optimizedObjectKey)
        : getPublicUrl(m.media.originalObjectKey),
      thumbnailUrl: m.media.thumbnailObjectKey ? getPublicUrl(m.media.thumbnailObjectKey) : null,
    })),
  };
}

export async function listVendorStoreItems(userId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  let store = await storeRepository.findVendorStoreByVendorId(vendor.id);
  if (!store) {
    const created = await storeRepository.upsertVendorStore(vendor.id, {}, vendor.businessName, vendor.slug);
    store = { ...created, _count: { items: 0, orders: 0 } };
  }

  const items = await storeRepository.findStoreItems(store.id, true);
  return items.map(formatItemMedia);
}

export async function createStoreItem(userId: string, input: CreateStoreItemInput) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const isEligible = await storeRepository.checkVendorStoreEligibility(vendor.id);
  if (!isEligible) {
    throw new ValidationError("Category is not eligible for vendor store");
  }

  let store = await storeRepository.findVendorStoreByVendorId(vendor.id);
  if (!store) {
    const created = await storeRepository.upsertVendorStore(vendor.id, {}, vendor.businessName, vendor.slug);
    store = { ...created, _count: { items: 0, orders: 0 } };
  }

  const baseSlug = slugify(input.title);
  const slug = await generateUniqueSlug(baseSlug, async (candidate) => {
    const existing = await storeRepository.findStoreItems(store.id, true);
    return existing.some((item) => item.slug === candidate);
  });

  const item = await storeRepository.createStoreItem(store.id, {
    title: input.title,
    slug,
    description: input.description,
    itemType: input.itemType ?? "PHYSICAL_PRODUCT",
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    gstRate: input.gstRate ?? 18,
    minOrderQuantity: input.minOrderQuantity ?? 1,
    stockQuantity: input.stockQuantity,
    isAvailable: input.isAvailable ?? true,
    tags: input.tags ?? [],
    mediaIds: input.mediaIds,
  });

  const created = await storeRepository.findStoreItemById(item.id);
  if (!created) throw new NotFoundError("Failed to fetch created store item");
  return formatItemMedia(created);
}

export async function updateStoreItem(userId: string, itemId: string, input: UpdateStoreItemInput) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const existing = await storeRepository.findStoreItemById(itemId);
  if (!existing || existing.store.vendorId !== vendor.id) {
    throw new NotFoundError("Store item not found");
  }

  const updated = await storeRepository.updateStoreItem(itemId, {
    title: input.title,
    description: input.description,
    itemType: input.itemType,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    gstRate: input.gstRate,
    minOrderQuantity: input.minOrderQuantity,
    stockQuantity: input.stockQuantity,
    isAvailable: input.isAvailable,
    tags: input.tags,
    mediaIds: input.mediaIds,
  });

  const reloaded = await storeRepository.findStoreItemById(updated.id);
  if (!reloaded) throw new NotFoundError("Failed to fetch updated store item");
  return formatItemMedia(reloaded);
}

export async function deleteStoreItem(userId: string, itemId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const existing = await storeRepository.findStoreItemById(itemId);
  if (!existing || existing.store.vendorId !== vendor.id) {
    throw new NotFoundError("Store item not found");
  }

  await storeRepository.deleteStoreItem(itemId);
  return { success: true };
}

export async function listVendorStoreOrders(userId: string, status?: StoreOrderStatus) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const store = await storeRepository.findVendorStoreByVendorId(vendor.id);
  if (!store) return [];

  const orders = await storeRepository.findStoreOrders(store.id, status);
  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    shippingAddress: o.shippingAddress,
    city: o.city,
    customerState: o.customerState,
    pincode: o.pincode,
    eventDate: o.eventDate ? o.eventDate.toISOString() : null,
    totalAmount: Number(o.totalAmount),
    status: o.status,
    orderChannel: o.orderChannel,
    paymentStatus: o.paymentStatus,
    notes: o.notes,
    invoiceId: o.invoiceId,
    invoice: o.invoice,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      itemTitle: i.itemTitle,
      unitPrice: Number(i.unitPrice),
      gstRate: i.gstRate,
      quantity: i.quantity,
      totalPrice: Number(i.totalPrice),
      customizationNotes: i.customizationNotes,
    })),
  }));
}

export async function updateStoreOrderStatus(
  userId: string,
  orderId: string,
  input: UpdateOrderStatusInput,
) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const order = await storeRepository.findStoreOrderById(orderId);
  if (!order || order.store.vendorId !== vendor.id) {
    throw new NotFoundError("Order not found");
  }

  if (input.paymentStatus && order.orderChannel === "ONLINE" && input.paymentStatus !== order.paymentStatus) {
    throw new ValidationError(
      "Online order payment status is cryptographically managed by payment gateway webhooks and cannot be changed manually.",
    );
  }

  return storeRepository.updateStoreOrderStatus(orderId, {
    status: input.status,
    paymentStatus: input.paymentStatus,
  });
}

export async function createOrderInvoice(userId: string, orderId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const order = await storeRepository.findStoreOrderById(orderId);
  if (!order || order.store.vendorId !== vendor.id) {
    throw new NotFoundError("Order not found");
  }

  if (order.invoiceId) {
    return { invoiceId: order.invoiceId, alreadyExists: true };
  }

  const billingProfile = order.store.vendor.billingProfile;
  if (!billingProfile) {
    throw new ValidationError(
      "Please configure your Vendor Billing Profile under Invoices > Settings before generating a GST invoice.",
    );
  }

  const today = new Date().toISOString().split("T")[0]!;
  const placeOfSupply = (order.customerState?.trim() || billingProfile.state || "").trim() || "Tamil Nadu";

  const invoice = await vendorInvoiceService.createInvoice(vendor.id, userId, {
    issueDate: today,
    clientName: order.customerName,
    clientPhone: order.customerPhone,
    clientEmail: order.customerEmail ?? null,
    clientAddress: order.shippingAddress ?? null,
    clientCity: order.city ?? null,
    clientState: order.customerState ?? null,
    placeOfSupply,
    notes: `Generated from Store Order #${order.orderNumber}.`,
    items: order.items.map((item) => ({
      description: item.itemTitle,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      gstRate: item.gstRate,
    })),
  });

  await storeRepository.linkOrderInvoice(order.id, invoice.id);
  return { invoice, alreadyExists: false };
}

// ---------------------------------------------------------------------------
// Public Storefront Methods
// ---------------------------------------------------------------------------

export async function getPublicStoreBySlug(slug: string) {
  const store = await storeRepository.findVendorStoreBySlug(slug);
  if (!store || !store.isEnabled || store.vendor.status !== "APPROVED") {
    throw new NotFoundError("Store not found or inactive");
  }

  const isEligible = store.vendor.categories.some(
    (vc) => vc.category.hasStoreEnabled && vc.category.isActive,
  );
  if (!isEligible) {
    throw new NotFoundError("Store is not active for this vendor category");
  }

  const isOnlinePaymentEnabled = vendorPaymentService.canVendorAcceptOnlinePayments(
    store.vendor.paymentAccount as any,
  ).eligible;

  return {
    id: store.id,
    vendorId: store.vendor.id,
    storeName: store.storeName,
    slug: store.slug,
    tagline: store.tagline,
    aboutStore: store.aboutStore,
    whatsappOrderPhone: store.whatsappOrderPhone || store.vendor.profile?.phone || null,
    shippingPolicy: store.shippingPolicy,
    returnPolicy: store.returnPolicy,
    minOrderValue: store.minOrderValue ? Number(store.minOrderValue) : null,
    isOnlinePaymentEnabled,
    vendor: {
      businessName: store.vendor.businessName,
      slug: store.vendor.slug,
      address: store.vendor.profile?.address ?? null,
      email: store.vendor.profile?.email ?? null,
      phone: store.vendor.profile?.phone ?? null,
      logoUrl: store.vendor.profile?.logoMedia?.thumbnailObjectKey
        ? getPublicUrl(store.vendor.profile.logoMedia.thumbnailObjectKey)
        : store.vendor.profile?.logoMedia?.originalObjectKey
        ? getPublicUrl(store.vendor.profile.logoMedia.originalObjectKey)
        : null,
      coverUrl: store.vendor.profile?.coverMedia?.optimizedObjectKey
        ? getPublicUrl(store.vendor.profile.coverMedia.optimizedObjectKey)
        : store.vendor.profile?.coverMedia?.originalObjectKey
        ? getPublicUrl(store.vendor.profile.coverMedia.originalObjectKey)
        : null,
    },
  };
}

export async function listPublicStoreItems(slug: string) {
  const store = await getPublicStoreBySlug(slug);
  const items = await storeRepository.findStoreItems(store.id, false);
  return items.map(formatItemMedia);
}

export async function createPublicStoreOrder(slug: string, input: PublicCreateOrderInput) {
  const store = await storeRepository.findVendorStoreBySlug(slug);
  if (!store || !store.isEnabled || store.vendor.status !== "APPROVED") {
    throw new NotFoundError("Store not found or inactive");
  }

  const isCategoryEligible = store.vendor.categories.some(
    (vc) => vc.category.hasStoreEnabled && vc.category.isActive,
  );
  if (!isCategoryEligible) {
    throw new NotFoundError("Store is not active for this vendor category");
  }

  const availableItems = await storeRepository.findStoreItems(store.id, false);
  const itemMap = new Map(availableItems.map((i) => [i.id, i]));

  const orderLineItems: Array<{
    itemId: string;
    itemTitle: string;
    unitPrice: number;
    gstRate: number;
    quantity: number;
    totalPrice: number;
    customizationNotes?: string | null | undefined;
  }> = [];

  let subtotal = 0;
  let gstTotal = 0;

  for (const requestedItem of input.items) {
    const item = itemMap.get(requestedItem.itemId);
    if (!item) {
      throw new ValidationError(`Product ${requestedItem.itemId} is unavailable or out of stock`);
    }

    if (requestedItem.quantity < item.minOrderQuantity) {
      throw new ValidationError(
        `Minimum order quantity for "${item.title}" is ${item.minOrderQuantity}`,
      );
    }

    if (item.stockQuantity !== null) {
      const pendingCheckouts = await prisma.vendorStoreOrderItem.findMany({
        where: {
          itemId: item.id,
          order: {
            paymentStatus: "PENDING",
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        },
        select: { quantity: true },
      });
      const reservedQuantity = pendingCheckouts.reduce((sum, r) => sum + r.quantity, 0);
      const availableUnits = item.stockQuantity - reservedQuantity;
      if (availableUnits < requestedItem.quantity) {
        throw new ValidationError(
          `"${item.title}" is currently out of stock or reserved by another checkout session (${Math.max(0, availableUnits)} available).`,
        );
      }
    }

    const unitPrice = Number(item.price);
    const lineTotal = Number((unitPrice * requestedItem.quantity).toFixed(2));
    const itemGst = Number(((lineTotal * item.gstRate) / 100).toFixed(2));

    subtotal += lineTotal;
    gstTotal += itemGst;

    orderLineItems.push({
      itemId: item.id,
      itemTitle: item.title,
      unitPrice,
      gstRate: item.gstRate,
      quantity: requestedItem.quantity,
      totalPrice: lineTotal,
      customizationNotes: requestedItem.customizationNotes,
    });
  }

  const totalAmount = Math.round(subtotal + gstTotal);

  if (store.minOrderValue && totalAmount < Number(store.minOrderValue)) {
    throw new ValidationError(`Minimum order value for this store is ₹${store.minOrderValue}`);
  }

  const paymentMethod = input.paymentMethod || "WHATSAPP";

  if (paymentMethod === "ONLINE") {
    const paymentAccount = store.vendor.paymentAccount;
    const eligibility = vendorPaymentService.canVendorAcceptOnlinePayments(paymentAccount);
    if (!eligibility.eligible) {
      throw new ValidationError(
        eligibility.reason ||
          "Online payments are not currently active for this store. Please complete your order via WhatsApp.",
      );
    }

    const financials = vendorPaymentService.calculateOrderFinancials(totalAmount);

    const order = await storeRepository.createStoreOrderAtomicTx(
      store.id,
      {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        shippingAddress: input.shippingAddress,
        city: input.city,
        customerState: input.customerState,
        pincode: input.pincode,
        eventDate: input.eventDate ? new Date(input.eventDate) : null,
        notes: input.notes,
        subtotal,
        discount: 0,
        gstAmount: gstTotal,
        totalAmount,
        orderChannel: "ONLINE",
        paymentStatus: "PENDING",
        paymentProvider: "razorpay",
        vendorPaymentAccountId: paymentAccount!.id,
        platformCommission: financials.platformCommission,
        gatewayFee: financials.gatewayFee,
        estimatedGatewayFee: financials.gatewayFee,
        vendorSettlementAmount: financials.vendorSettlementAmount,
      },
      orderLineItems,
    );

    let rzpOrderInfo: { razorpayOrderId: string; keyId: string };
    try {
      rzpOrderInfo = await vendorPaymentService.createStorePaymentOrder(
        {
          id: order.id,
          orderNumber: order.orderNumber,
          store: { slug: store.slug, vendorId: store.vendorId },
        },
        totalAmount,
        {
          razorpayAccountId: paymentAccount!.razorpayAccountId,
          status: paymentAccount!.status,
          chargesEnabled: paymentAccount!.chargesEnabled,
          payoutsEnabled: paymentAccount!.payoutsEnabled,
          bankVerificationStatus: paymentAccount!.bankVerificationStatus,
          transferEligibleAt: paymentAccount!.transferEligibleAt,
          routeActivationStatus: paymentAccount!.routeActivationStatus,
        },
        financials.vendorSettlementAmount,
      );
    } catch (err) {
      await prisma.vendorStoreOrder.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", status: "CANCELLED" },
      });
      throw err;
    }

    await prisma.vendorStoreOrder.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrderInfo.razorpayOrderId },
    });

    return {
      orderNumber: order.orderNumber,
      orderId: order.id,
      totalAmount,
      paymentMethod: "ONLINE",
      razorpayOrderId: rzpOrderInfo.razorpayOrderId,
      keyId: rzpOrderInfo.keyId,
      currency: "INR",
    };
  }

  // Fallback / standard WHATSAPP order flow
  const order = await storeRepository.createStoreOrderAtomicTx(
    store.id,
    {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      shippingAddress: input.shippingAddress,
      city: input.city,
      customerState: input.customerState,
      pincode: input.pincode,
      eventDate: input.eventDate ? new Date(input.eventDate) : null,
      notes: input.notes,
      subtotal,
      discount: 0,
      gstAmount: gstTotal,
      totalAmount,
      orderChannel: "WHATSAPP",
      paymentStatus: "PENDING",
      paymentProvider: "razorpay",
      platformCommission: 0,
      gatewayFee: 0,
      vendorSettlementAmount: totalAmount,
    },
    orderLineItems,
  );

  // Build formatted WhatsApp message and link
  const targetPhone = normalizePhone(store.whatsappOrderPhone || store.vendor.profile?.phone || "919999999999");
  const itemsSummary = orderLineItems
    .map((item) => `• ${item.itemTitle} × ${item.quantity} (₹${item.unitPrice}) = ₹${item.totalPrice}`)
    .join("\n");

  const locationSummary = [input.city, input.customerState].filter(Boolean).join(", ");
  const formattedText = [
    `Hello ${store.storeName}! 🌸`,
    `I'd like to place an order from your WedHub Store (Order #${order.orderNumber}):`,
    "",
    "🛒 *Items Requested:*",
    itemsSummary,
    "",
    `💰 *Total Estimated:* ₹${totalAmount.toLocaleString("en-IN")}`,
    input.eventDate ? `📅 *Event Date:* ${input.eventDate}` : "",
    locationSummary ? `📍 *Delivery Location:* ${locationSummary}` : "",
    `👤 *Ordered by:* ${input.customerName} (${input.customerPhone})`,
    input.notes ? `📝 *Notes:* ${input.notes}` : "",
    "",
    "Could you please confirm availability and payment details?",
  ]
    .filter((line) => line !== undefined && line !== "")
    .join("\n");

  const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(formattedText)}`;

  return {
    orderNumber: order.orderNumber,
    orderId: order.id,
    totalAmount,
    paymentMethod: "WHATSAPP",
    whatsappUrl,
  };
}

