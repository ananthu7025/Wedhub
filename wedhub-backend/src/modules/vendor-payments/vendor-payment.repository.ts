import { prisma } from "../../config/database";
import { Prisma, type VendorPaymentAccountStatus, type StorePaymentStatus, type StoreTransferStatus } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../common/errors";
import { isValidPaymentStatusTransition, isValidTransferStatusTransition } from "./vendor-payment.types";
import { logger } from "../../config/logger";

export function findPaymentAccountByVendorId(vendorId: string) {
  return prisma.vendorPaymentAccount.findUnique({
    where: { vendorId },
  });
}

export function findPaymentAccountByRazorpayAccountId(razorpayAccountId: string) {
  return prisma.vendorPaymentAccount.findUnique({
    where: { razorpayAccountId },
    include: { vendor: true },
  });
}

export function upsertPaymentAccount(
  vendorId: string,
  data: {
    razorpayAccountId?: string | null;
    legalBusinessName: string;
    businessType: string;
    contactEmail: string;
    contactPhone: string;
    bankName: string;
    accountNumberMasked: string;
    ifscCode: string;
    status?: VendorPaymentAccountStatus;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    razorpayStakeholderId?: string | null;
    razorpayRouteProductId?: string | null;
    bankVerificationStatus?: string;
    bankVerificationFailureReason?: string | null;
    routeActivationStatus?: string | null;
    transferEligibleAt?: Date | null;
    lastProviderSyncAt?: Date | null;
  },
) {
  return prisma.vendorPaymentAccount.upsert({
    where: { vendorId },
    create: {
      vendorId,
      razorpayAccountId: data.razorpayAccountId ?? null,
      legalBusinessName: data.legalBusinessName,
      businessType: data.businessType,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      bankName: data.bankName,
      accountNumberMasked: data.accountNumberMasked,
      ifscCode: data.ifscCode,
      status: data.status || "PENDING_VERIFICATION",
      chargesEnabled: data.chargesEnabled ?? false,
      payoutsEnabled: data.payoutsEnabled ?? false,
      razorpayStakeholderId: data.razorpayStakeholderId ?? null,
      razorpayRouteProductId: data.razorpayRouteProductId ?? null,
      bankVerificationStatus: data.bankVerificationStatus || "UNKNOWN",
      bankVerificationFailureReason: data.bankVerificationFailureReason ?? null,
      routeActivationStatus: data.routeActivationStatus ?? null,
      transferEligibleAt: data.transferEligibleAt ?? null,
      lastProviderSyncAt: data.lastProviderSyncAt ?? null,
    },
    update: {
      ...(data.razorpayAccountId !== undefined ? { razorpayAccountId: data.razorpayAccountId } : {}),
      legalBusinessName: data.legalBusinessName,
      businessType: data.businessType,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      bankName: data.bankName,
      accountNumberMasked: data.accountNumberMasked,
      ifscCode: data.ifscCode,
      ...(data.status ? { status: data.status } : {}),
      ...(data.chargesEnabled !== undefined ? { chargesEnabled: data.chargesEnabled } : {}),
      ...(data.payoutsEnabled !== undefined ? { payoutsEnabled: data.payoutsEnabled } : {}),
      ...(data.razorpayStakeholderId !== undefined ? { razorpayStakeholderId: data.razorpayStakeholderId } : {}),
      ...(data.razorpayRouteProductId !== undefined ? { razorpayRouteProductId: data.razorpayRouteProductId } : {}),
      ...(data.bankVerificationStatus !== undefined ? { bankVerificationStatus: data.bankVerificationStatus } : {}),
      ...(data.bankVerificationFailureReason !== undefined ? { bankVerificationFailureReason: data.bankVerificationFailureReason } : {}),
      ...(data.routeActivationStatus !== undefined ? { routeActivationStatus: data.routeActivationStatus } : {}),
      ...(data.transferEligibleAt !== undefined ? { transferEligibleAt: data.transferEligibleAt } : {}),
      ...(data.lastProviderSyncAt !== undefined ? { lastProviderSyncAt: data.lastProviderSyncAt } : {}),
    },
  });
}

export function updatePaymentAccountStatus(
  vendorId: string,
  data: {
    status?: VendorPaymentAccountStatus;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    razorpayAccountStatus?: string | null;
    routeActivationStatus?: string | null;
    bankVerificationStatus?: string;
    linkedAccountCreatedAt?: Date | null;
    transferEligibleAt?: Date | null;
    lastProviderSyncAt?: Date | null;
  },
) {
  return prisma.vendorPaymentAccount.update({
    where: { vendorId },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.chargesEnabled !== undefined ? { chargesEnabled: data.chargesEnabled } : {}),
      ...(data.payoutsEnabled !== undefined ? { payoutsEnabled: data.payoutsEnabled } : {}),
      ...(data.razorpayAccountStatus !== undefined ? { razorpayAccountStatus: data.razorpayAccountStatus } : {}),
      ...(data.routeActivationStatus !== undefined ? { routeActivationStatus: data.routeActivationStatus } : {}),
      ...(data.bankVerificationStatus !== undefined ? { bankVerificationStatus: data.bankVerificationStatus } : {}),
      ...(data.linkedAccountCreatedAt !== undefined ? { linkedAccountCreatedAt: data.linkedAccountCreatedAt } : {}),
      ...(data.transferEligibleAt !== undefined ? { transferEligibleAt: data.transferEligibleAt } : {}),
      ...(data.lastProviderSyncAt !== undefined ? { lastProviderSyncAt: data.lastProviderSyncAt } : {}),
    },
  });
}

export function updatePaymentAccountByRazorpayId(
  razorpayAccountId: string,
  data: {
    status?: VendorPaymentAccountStatus;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  },
) {
  return prisma.vendorPaymentAccount.updateMany({
    where: { razorpayAccountId },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.chargesEnabled !== undefined ? { chargesEnabled: data.chargesEnabled } : {}),
      ...(data.payoutsEnabled !== undefined ? { payoutsEnabled: data.payoutsEnabled } : {}),
    },
  });
}

export function findStoreOrderById(orderId: string) {
  return prisma.vendorStoreOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      refunds: true,
      vendorPaymentAccount: true,
      store: {
        include: {
          vendor: true,
        },
      },
    },
  });
}

export function findStoreOrderByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.vendorStoreOrder.findFirst({
    where: { razorpayOrderId },
    include: {
      items: true,
      refunds: true,
      vendorPaymentAccount: true,
      store: {
        include: {
          vendor: true,
        },
      },
    },
  });
}

export async function markOrderPaymentCaptured(
  orderId: string,
  data: {
    razorpayPaymentId: string;
    paidAt?: Date | null | undefined;
    actualGatewayFee?: number | null | undefined;
  },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.vendorStoreOrder.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true },
    });
    if (existing && !isValidPaymentStatusTransition(existing.paymentStatus, "CAPTURED")) {
      // Webhooks can redeliver/reorder events — skip rather than throw so a
      // late/duplicate delivery against an already-refunded or cancelled
      // order doesn't 500 and get endlessly retried by the gateway.
      logger.warn(
        { orderId, from: existing.paymentStatus, to: "CAPTURED" },
        "Ignoring invalid payment status transition",
      );
      return tx.vendorStoreOrder.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    }

    const updatePayload: Prisma.VendorStoreOrderUpdateInput = {
      paymentStatus: "CAPTURED",
      status: "CONFIRMED",
      razorpayPaymentId: data.razorpayPaymentId,
      paidAt: data.paidAt || new Date(),
    };

    if (data.actualGatewayFee !== undefined && data.actualGatewayFee !== null) {
      updatePayload.actualGatewayFee = new Prisma.Decimal(data.actualGatewayFee);
      updatePayload.gatewayFee = new Prisma.Decimal(data.actualGatewayFee);
    }

    const updatedOrder = await tx.vendorStoreOrder.update({
      where: { id: orderId },
      data: updatePayload,
      include: {
        items: true,
      },
    });

    // Stock is already reserved atomically at order-creation time (see
    // createStoreOrderAtomicTx) — this is a read-only safety-net check, not
    // a second decrement, so a concurrent-oversell scenario (which the
    // atomic reservation should already prevent) is still flagged if it
    // somehow occurs rather than silently going negative.
    let isOversold = false;
    for (const lineItem of updatedOrder.items) {
      if (!lineItem.itemId) continue;
      const storeItem = await tx.vendorStoreItem.findUnique({
        where: { id: lineItem.itemId },
        select: { stockQuantity: true },
      });
      if (storeItem && storeItem.stockQuantity !== null && storeItem.stockQuantity < 0) {
        isOversold = true;
      }
    }

    if (isOversold) {
      const existingNote = updatedOrder.notes ? `${updatedOrder.notes} | ` : "";
      await tx.vendorStoreOrder.update({
        where: { id: orderId },
        data: {
          notes: `${existingNote}[STOCK_WARNING: One or more items were ordered concurrently when stock was insufficient. Review inventory or initiate partial/full refund.]`,
        },
      });
    }

    return updatedOrder;
  });
}

export async function markOrderPaymentFailed(orderId: string) {
  const existing = await prisma.vendorStoreOrder.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
  if (existing && !isValidPaymentStatusTransition(existing.paymentStatus, "FAILED")) {
    logger.warn({ orderId, from: existing.paymentStatus, to: "FAILED" }, "Ignoring invalid payment status transition");
    return prisma.vendorStoreOrder.findUniqueOrThrow({ where: { id: orderId } });
  }

  return prisma.vendorStoreOrder.update({
    where: { id: orderId },
    data: {
      paymentStatus: "FAILED",
    },
  });
}

export async function createOrderRefundTx(
  orderId: string,
  data: {
    razorpayRefundId?: string;
    amount: number;
    reason?: string;
    isFullyRefunded: boolean;
  },
) {
  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.vendorStoreOrder.findUnique({
      where: { id: orderId },
      include: { refunds: true },
    });
    if (!existingOrder) {
      throw new NotFoundError("Order not found");
    }

    const currentTotalRefunded = existingOrder.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const orderTotal = Number(existingOrder.totalAmount);
    if (currentTotalRefunded + data.amount > orderTotal) {
      throw new ValidationError(
        `Refund amount ₹${data.amount} exceeds remaining refundable balance ₹${orderTotal - currentTotalRefunded}`,
      );
    }

    const isFull = currentTotalRefunded + data.amount >= orderTotal;
    const newPaymentStatus: StorePaymentStatus = isFull ? "REFUNDED" : "PARTIALLY_REFUNDED";

    if (!isValidPaymentStatusTransition(existingOrder.paymentStatus, newPaymentStatus)) {
      throw new ValidationError(
        `Cannot refund an order in payment status ${existingOrder.paymentStatus}.`,
      );
    }

    const refund = await tx.vendorStoreOrderRefund.create({
      data: {
        orderId,
        razorpayRefundId: data.razorpayRefundId ?? null,
        amount: data.amount,
        reason: data.reason ?? null,
        status: "PROCESSED",
      },
    });

    const updatedOrder = await tx.vendorStoreOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: newPaymentStatus,
      },
    });

    // Update associated Route transfer to REVERSED or PARTIALLY_REVERSED
    const transfer = await tx.vendorStoreTransfer.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
    if (transfer) {
      await tx.vendorStoreTransfer.update({
        where: { id: transfer.id },
        data: {
          status: isFull ? "REVERSED" : "PARTIALLY_REVERSED",
          reversedAt: new Date(),
        },
      });
    }

    return { refund, updatedOrder };
  });
}

export async function getVendorPaymentMetrics(vendorId: string) {
  const orders = await prisma.vendorStoreOrder.findMany({
    where: {
      store: { vendorId },
    },
    include: {
      refunds: true,
      transfers: true,
      settlements: true,
    },
  });

  let totalGmv = 0;
  let totalPaidOrders = 0;
  let transferredAmount = 0;
  let settledAmount = 0;
  let pendingSettlementAmount = 0;
  let totalRefundedAmount = 0;

  for (const o of orders) {
    if (o.paymentStatus === "CAPTURED" || o.paymentStatus === "PARTIALLY_REFUNDED" || o.paymentStatus === "REFUNDED") {
      const amount = Number(o.totalAmount);
      totalGmv += amount;
      totalPaidOrders += 1;

      const orderRefunds = o.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
      totalRefundedAmount += orderRefunds;

      const netPayable = Math.max(0, Number(o.vendorSettlementAmount || o.totalAmount) - orderRefunds);

      // Route transfers allocated to linked account
      const hasProcessedTransfer = o.transfers?.some((t) => t.status === "PROCESSED");
      if (hasProcessedTransfer) {
        transferredAmount += netPayable;
      }

      // Provider settlements: money confirmed arrived at vendor bank account with UTR
      const hasSettlement = o.settlements?.some((s) => s.status === "PROCESSED" || s.status === "RECONCILED" || Boolean(s.utr));
      if (hasSettlement) {
        settledAmount += netPayable;
      } else {
        pendingSettlementAmount += netPayable;
      }
    }
  }

  return {
    totalGmv,
    totalRevenue: totalGmv,
    totalPaidOrders,
    transferredAmount,
    settledAmount,
    completedSettlementAmount: settledAmount,
    pendingSettlementAmount,
    pendingSettlement: pendingSettlementAmount,
    totalRefundedAmount,
    refundedAmount: totalRefundedAmount,
    platformCommission: 0,
  };
}

export function createStoreTransferRecord(data: {
  orderId: string;
  vendorId: string;
  paymentAccountId?: string | null | undefined;
  razorpayOrderId?: string | null | undefined;
  razorpayPaymentId?: string | null | undefined;
  providerTransferId?: string | null | undefined;
  recipientAccountId: string;
  amount: number;
  currency?: string | undefined;
  status?: "CREATED" | "PENDING" | "PROCESSED" | "FAILED" | "REVERSED";
}) {
  return prisma.vendorStoreTransfer.create({
    data: {
      orderId: data.orderId,
      vendorId: data.vendorId,
      paymentAccountId: data.paymentAccountId ?? null,
      razorpayOrderId: data.razorpayOrderId ?? null,
      razorpayPaymentId: data.razorpayPaymentId ?? null,
      providerTransferId: data.providerTransferId ?? null,
      recipientAccountId: data.recipientAccountId,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency || "INR",
      status: data.status || "CREATED",
    },
  });
}

export async function updateStoreTransferStatus(
  providerTransferId: string,
  data: {
    status: "CREATED" | "PENDING" | "PROCESSED" | "FAILED" | "REVERSED" | "PARTIALLY_REVERSED";
    failureCode?: string | null;
    failureReason?: string | null;
    processedAt?: Date | null;
    failedAt?: Date | null;
    reversedAt?: Date | null;
  },
) {
  const existing = await prisma.vendorStoreTransfer.findUnique({ where: { providerTransferId } });
  if (existing && !isValidTransferStatusTransition(existing.status, data.status as StoreTransferStatus)) {
    logger.warn(
      { providerTransferId, from: existing.status, to: data.status },
      "Ignoring invalid transfer status transition",
    );
    return existing;
  }

  const fields: Prisma.VendorStoreTransferUpdateInput = {
    status: data.status,
  };
  if (data.failureCode !== undefined) fields.failureCode = data.failureCode;
  if (data.failureReason !== undefined) fields.failureReason = data.failureReason;
  if (data.processedAt !== undefined) fields.processedAt = data.processedAt;
  if (data.failedAt !== undefined) fields.failedAt = data.failedAt;
  if (data.reversedAt !== undefined) fields.reversedAt = data.reversedAt;

  return prisma.vendorStoreTransfer.update({
    where: { providerTransferId },
    data: fields,
  });
}

export async function recordOrUpdateStoreTransfer(
  providerTransferId: string,
  data: {
    orderId?: string | null | undefined;
    vendorId?: string | null | undefined;
    paymentAccountId?: string | null | undefined;
    razorpayOrderId?: string | null | undefined;
    razorpayPaymentId?: string | null | undefined;
    recipientAccountId?: string | null | undefined;
    amount?: number | null | undefined;
    currency?: string | null | undefined;
    status: "CREATED" | "PENDING" | "PROCESSED" | "FAILED" | "REVERSED" | "PARTIALLY_REVERSED";
    failureCode?: string | null | undefined;
    failureReason?: string | null | undefined;
    processedAt?: Date | null | undefined;
    failedAt?: Date | null | undefined;
    reversedAt?: Date | null | undefined;
  },
) {
  // 1. Try finding by providerTransferId
  const existingByTransferId = await prisma.vendorStoreTransfer.findUnique({
    where: { providerTransferId },
  });

  if (existingByTransferId) {
    if (!isValidTransferStatusTransition(existingByTransferId.status, data.status as StoreTransferStatus)) {
      logger.warn(
        { providerTransferId, from: existingByTransferId.status, to: data.status },
        "Ignoring invalid transfer status transition",
      );
      return existingByTransferId;
    }
    return prisma.vendorStoreTransfer.update({
      where: { id: existingByTransferId.id },
      data: {
        status: data.status,
        failureCode: data.failureCode !== undefined ? data.failureCode : existingByTransferId.failureCode,
        failureReason: data.failureReason !== undefined ? data.failureReason : existingByTransferId.failureReason,
        processedAt: data.processedAt !== undefined ? data.processedAt : existingByTransferId.processedAt,
        failedAt: data.failedAt !== undefined ? data.failedAt : existingByTransferId.failedAt,
        reversedAt: data.reversedAt !== undefined ? data.reversedAt : existingByTransferId.reversedAt,
        ...(data.paymentAccountId !== undefined ? { paymentAccountId: data.paymentAccountId } : {}),
        ...(data.razorpayOrderId !== undefined ? { razorpayOrderId: data.razorpayOrderId } : {}),
        ...(data.razorpayPaymentId !== undefined ? { razorpayPaymentId: data.razorpayPaymentId } : {}),
      },
    });
  }

  // 2. If not found by transfer id, try finding by orderId if provided
  if (data.orderId) {
    const existingByOrder = await prisma.vendorStoreTransfer.findFirst({
      where: { orderId: data.orderId },
      orderBy: { createdAt: "desc" },
    });

    if (existingByOrder) {
      if (!isValidTransferStatusTransition(existingByOrder.status, data.status as StoreTransferStatus)) {
        logger.warn(
          { providerTransferId, orderId: data.orderId, from: existingByOrder.status, to: data.status },
          "Ignoring invalid transfer status transition",
        );
        return existingByOrder;
      }
      return prisma.vendorStoreTransfer.update({
        where: { id: existingByOrder.id },
        data: {
          providerTransferId,
          status: data.status,
          failureCode: data.failureCode !== undefined ? data.failureCode : existingByOrder.failureCode,
          failureReason: data.failureReason !== undefined ? data.failureReason : existingByOrder.failureReason,
          processedAt: data.processedAt !== undefined ? data.processedAt : existingByOrder.processedAt,
          failedAt: data.failedAt !== undefined ? data.failedAt : existingByOrder.failedAt,
          reversedAt: data.reversedAt !== undefined ? data.reversedAt : existingByOrder.reversedAt,
          ...(data.paymentAccountId !== undefined ? { paymentAccountId: data.paymentAccountId } : {}),
          ...(data.razorpayOrderId !== undefined ? { razorpayOrderId: data.razorpayOrderId } : {}),
          ...(data.razorpayPaymentId !== undefined ? { razorpayPaymentId: data.razorpayPaymentId } : {}),
        },
      });
    }
  }

  // 3. If still not found and we have enough data to create, create a new record
  if (data.orderId && data.vendorId && data.recipientAccountId && data.amount != null) {
    return prisma.vendorStoreTransfer.create({
      data: {
        orderId: data.orderId,
        vendorId: data.vendorId,
        paymentAccountId: data.paymentAccountId ?? null,
        razorpayOrderId: data.razorpayOrderId ?? null,
        razorpayPaymentId: data.razorpayPaymentId ?? null,
        providerTransferId,
        recipientAccountId: data.recipientAccountId,
        amount: new Prisma.Decimal(data.amount),
        currency: data.currency || "INR",
        status: data.status,
        failureCode: data.failureCode ?? null,
        failureReason: data.failureReason ?? null,
        processedAt: data.processedAt ?? null,
        failedAt: data.failedAt ?? null,
        reversedAt: data.reversedAt ?? null,
      },
    });
  }

  return null;
}

export function recordPaymentAttempt(data: {
  orderId: string;
  attemptNumber?: number;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  amount: number;
  currency?: string;
  status?: StorePaymentStatus;
}) {
  return prisma.vendorStorePaymentAttempt.create({
    data: {
      orderId: data.orderId,
      attemptNumber: data.attemptNumber || 1,
      razorpayOrderId: data.razorpayOrderId ?? null,
      razorpayPaymentId: data.razorpayPaymentId ?? null,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency || "INR",
      status: data.status || "PENDING",
    },
  });
}

export async function updatePaymentAttempt(
  orderId: string,
  secondaryId: string,
  data: {
    razorpayPaymentId?: string | null;
    status: StorePaymentStatus;
    failureCode?: string | null;
    failureReason?: string | null;
    authorizedAt?: Date | null;
    capturedAt?: Date | null;
    failedAt?: Date | null;
  },
) {
  const attempt = await prisma.vendorStorePaymentAttempt.findFirst({
    where: {
      OR: [
        { razorpayPaymentId: orderId },
        { razorpayOrderId: orderId },
        { orderId: orderId },
        { razorpayOrderId: secondaryId },
        { razorpayPaymentId: secondaryId },
        { orderId: secondaryId },
      ],
    },
    orderBy: { attemptNumber: "desc" },
  });
  if (!attempt) return null;

  return prisma.vendorStorePaymentAttempt.update({
    where: { id: attempt.id },
    data: {
      status: data.status,
      ...(data.razorpayPaymentId ? { razorpayPaymentId: data.razorpayPaymentId } : {}),
      ...(data.failureCode !== undefined ? { failureCode: data.failureCode } : {}),
      ...(data.failureReason !== undefined ? { failureReason: data.failureReason } : {}),
      ...(data.authorizedAt !== undefined ? { authorizedAt: data.authorizedAt } : {}),
      ...(data.capturedAt !== undefined ? { capturedAt: data.capturedAt } : {}),
      ...(data.failedAt !== undefined ? { failedAt: data.failedAt } : {}),
    },
  });
}

export async function recordOrUpdateStoreSettlement(
  providerSettlementId: string,
  data: {
    recipientAccountId?: string | undefined;
    vendorId?: string | undefined;
    orderId?: string | null | undefined;
    amount: number;
    fees?: number | undefined;
    tax?: number | undefined;
    utr?: string | null | undefined;
    status?: string | undefined;
    processedAt?: Date | null | undefined;
    reconciledAt?: Date | null | undefined;
  },
) {
  const recipientAccountId = data.recipientAccountId || "";
  const vendorId = data.vendorId || "";

  return prisma.vendorStoreSettlement.upsert({
    where: { providerSettlementId },
    create: {
      providerSettlementId,
      recipientAccountId,
      vendorId,
      orderId: data.orderId ?? null,
      amount: new Prisma.Decimal(data.amount),
      fees: new Prisma.Decimal(data.fees ?? 0),
      tax: new Prisma.Decimal(data.tax ?? 0),
      utr: data.utr ?? null,
      status: data.status || "PROCESSED",
      processedAt: data.processedAt ?? new Date(),
      reconciledAt: data.reconciledAt ?? null,
    },
    update: {
      ...(data.amount !== undefined ? { amount: new Prisma.Decimal(data.amount) } : {}),
      ...(data.fees !== undefined ? { fees: new Prisma.Decimal(data.fees) } : {}),
      ...(data.tax !== undefined ? { tax: new Prisma.Decimal(data.tax) } : {}),
      ...(data.utr !== undefined ? { utr: data.utr } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.processedAt !== undefined ? { processedAt: data.processedAt } : {}),
      ...(data.reconciledAt !== undefined ? { reconciledAt: data.reconciledAt } : {}),
    },
  });
}





