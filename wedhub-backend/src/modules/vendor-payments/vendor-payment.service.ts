import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { NotFoundError, ValidationError } from "../../common/errors";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as razorpayClient from "../../integrations/payment/razorpay.client";
import * as paymentRepository from "./vendor-payment.repository";
import type {
  OnboardPaymentAccountInput,
  VerifyStoreOrderPaymentInput,
  RefundStoreOrderInput,
  VendorPaymentAccountSummary,
  VendorPaymentMetrics,
} from "./vendor-payment.types";

export async function getVendorPaymentAccount(userId: string): Promise<VendorPaymentAccountSummary | null> {
  const vendor = await getOwnedVendorOrThrow(userId);
  const account = await paymentRepository.findPaymentAccountByVendorId(vendor.id);
  if (!account) return null;

  return {
    id: account.id,
    vendorId: account.vendorId,
    provider: account.provider,
    razorpayAccountId: account.razorpayAccountId,
    status: account.status,
    legalBusinessName: account.legalBusinessName,
    businessType: account.businessType,
    contactEmail: account.contactEmail,
    contactPhone: account.contactPhone,
    bankName: account.bankName,
    accountNumberMasked: account.accountNumberMasked,
    ifscCode: account.ifscCode,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    bankVerificationStatus: account.bankVerificationStatus,
    routeActivationStatus: account.routeActivationStatus,
    transferEligibleAt: account.transferEligibleAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function onboardVendorPaymentAccount(
  userId: string,
  input: OnboardPaymentAccountInput,
): Promise<VendorPaymentAccountSummary> {
  const vendor = await getOwnedVendorOrThrow(userId);

  // Mask bank account number before persisting
  const cleanAcc = input.accountNumber.trim();
  const last4 = cleanAcc.slice(-4);
  const accountNumberMasked = `•••• •••• ${last4}`;

  let razorpayAccountId: string | null = null;
  let razorpayStakeholderId: string | null = null;
  let razorpayRouteProductId: string | null = null;
  let routeActivationStatus: string | null = "requested";
  // Accounts start in PENDING_VERIFICATION until Razorpay penny testing/KYC activates them
  let status: "ACTIVE" | "PENDING_VERIFICATION" = "PENDING_VERIFICATION";

  if (razorpayClient.isPaymentProviderConfigured()) {
    try {
      const created = await razorpayClient.createLinkedAccount({
        email: input.contactEmail.trim().toLowerCase(),
        phone: input.contactPhone.trim(),
        type: "standard",
        legalBusinessName: input.legalBusinessName.trim(),
        businessType: input.businessType,
        contactName: input.legalBusinessName.trim(),
        notes: {
          vendorId: vendor.id,
          businessName: vendor.businessName,
        },
      });

      razorpayAccountId = created.accountId;
      routeActivationStatus = created.status || "requested";
      // Only mark ACTIVE if Razorpay explicitly confirms the account is already activated
      status = created.status === "activated" ? "ACTIVE" : "PENDING_VERIFICATION";

      // Sequence stakeholder creation & Route product configuration as required by Route v2
      if (!razorpayAccountId.startsWith("acc_sim_") && !razorpayAccountId.startsWith("acc_test_")) {
        try {
          const stakeholder = await razorpayClient.createStakeholder(razorpayAccountId, {
            name: input.legalBusinessName.trim(),
            email: input.contactEmail.trim().toLowerCase(),
            phone: input.contactPhone.trim(),
            relationship: { executive: true },
          });
          razorpayStakeholderId = stakeholder.stakeholderId;
        } catch (stkErr) {
          logger.warn({ stkErr, accountId: razorpayAccountId }, "Stakeholder creation warning during onboarding");
        }

        try {
          const product = await razorpayClient.requestRouteProduct(razorpayAccountId);
          razorpayRouteProductId = product.productId;
          if (product.routeActivationStatus) routeActivationStatus = product.routeActivationStatus;
        } catch (prodErr) {
          logger.warn({ prodErr, accountId: razorpayAccountId }, "Route product request warning during onboarding");
        }

        if (razorpayRouteProductId) {
          try {
            const configured = await razorpayClient.configureRouteProduct(razorpayAccountId, razorpayRouteProductId, {
              accountNumber: input.accountNumber.trim(),
              ifscCode: input.ifscCode.trim().toUpperCase(),
              beneficiaryName: input.legalBusinessName.trim(),
            });
            if (configured.routeActivationStatus) routeActivationStatus = configured.routeActivationStatus;
          } catch (cfgErr) {
            logger.warn({ cfgErr, accountId: razorpayAccountId }, "Route product bank configuration warning during onboarding");
          }
        }
      }
    } catch (err) {
      logger.warn({ err, vendorId: vendor.id }, "Razorpay linked account creation failed; falling back to simulated onboarding");
      // If Route is not enabled on test key in development, register account in PENDING_VERIFICATION
      if (env.NODE_ENV === "development" || env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
        razorpayAccountId = `acc_test_${vendor.id.slice(0, 8)}`;
        status = "PENDING_VERIFICATION";
      } else {
        throw err;
      }
    }
  } else {
    // In dev environment without credentials, allow sandbox simulation
    razorpayAccountId = `acc_sim_${vendor.id.slice(0, 8)}`;
    status = "PENDING_VERIFICATION";
  }

  const account = await paymentRepository.upsertPaymentAccount(vendor.id, {
    razorpayAccountId,
    status,
    legalBusinessName: input.legalBusinessName.trim(),
    businessType: input.businessType,
    contactEmail: input.contactEmail.trim().toLowerCase(),
    contactPhone: input.contactPhone.trim(),
    bankName: input.bankName.trim(),
    accountNumberMasked,
    ifscCode: input.ifscCode.trim().toUpperCase(),
    chargesEnabled: status === "ACTIVE",
    payoutsEnabled: status === "ACTIVE",
    razorpayStakeholderId,
    razorpayRouteProductId,
    bankVerificationStatus: "PENDING",
    routeActivationStatus,
    lastProviderSyncAt: new Date(),
  });

  return {
    id: account.id,
    vendorId: account.vendorId,
    provider: account.provider,
    razorpayAccountId: account.razorpayAccountId,
    status: account.status,
    legalBusinessName: account.legalBusinessName,
    businessType: account.businessType,
    contactEmail: account.contactEmail,
    contactPhone: account.contactPhone,
    bankName: account.bankName,
    accountNumberMasked: account.accountNumberMasked,
    ifscCode: account.ifscCode,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    bankVerificationStatus: account.bankVerificationStatus,
    routeActivationStatus: account.routeActivationStatus,
    transferEligibleAt: account.transferEligibleAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function createVendorKycLink(userId: string): Promise<{ shortUrl: string }> {
  const vendor = await getOwnedVendorOrThrow(userId);
  const account = await paymentRepository.findPaymentAccountByVendorId(vendor.id);
  if (!account) {
    throw new NotFoundError("No linked payment account found. Please connect your bank account first.");
  }

  if (!account.razorpayAccountId) {
    throw new ValidationError("Payment account has no gateway reference.");
  }

  if (
    !razorpayClient.isPaymentProviderConfigured() ||
    account.razorpayAccountId.startsWith("acc_test_") ||
    account.razorpayAccountId.startsWith("acc_sim_")
  ) {
    // In dev / test simulator mode or fallback account, return simulated onboarding link
    return { shortUrl: `https://dashboard.razorpay.com/app/route/accounts/${account.razorpayAccountId}/kyc` };
  }

  try {
    return await razorpayClient.createAccountLink(account.razorpayAccountId);
  } catch (err) {
    logger.warn({ err, accountId: account.razorpayAccountId }, "Failed to generate Razorpay account link, returning dashboard fallback URL");
    return { shortUrl: `https://dashboard.razorpay.com/app/route/accounts/${account.razorpayAccountId}/kyc` };
  }
}

export function canVendorAcceptOnlinePayments(account: {
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  bankVerificationStatus?: string | undefined;
  transferEligibleAt?: Date | null | undefined;
  routeActivationStatus?: string | null | undefined;
} | null): { eligible: boolean; code?: string; reason?: string } {
  if (!account) {
    return {
      eligible: false,
      code: "NO_ACCOUNT",
      reason: "No linked bank account configured for online payments",
    };
  }

  if (account.status !== "ACTIVE") {
    return {
      eligible: false,
      code: "ACCOUNT_NOT_ACTIVE",
      reason: `Account verification is currently ${account.status.toLowerCase().replace("_", " ")}`,
    };
  }

  if (account.bankVerificationStatus === "FAILED") {
    return {
      eligible: false,
      code: "BANK_VERIFICATION_FAILED",
      reason: "Bank account validation failed penny drop test",
    };
  }

  if (account.routeActivationStatus && account.routeActivationStatus !== "activated") {
    return {
      eligible: false,
      code: "ROUTE_NOT_ACTIVATED",
      reason: `Razorpay Route product status is ${account.routeActivationStatus}`,
    };
  }

  if (account.transferEligibleAt && new Date() < account.transferEligibleAt) {
    return {
      eligible: false,
      code: "COOLING_PERIOD",
      reason: "Account is in standard cooling period following activation",
    };
  }

  if (!account.chargesEnabled || !account.payoutsEnabled) {
    return {
      eligible: false,
      code: "CAPABILITIES_DISABLED",
      reason: "Payment or payout capabilities are disabled for this account",
    };
  }

  return { eligible: true };
}


export { DEFAULT_GATEWAY_FEE_PERCENT, calculateOrderFinancials } from "./vendor-payment.types";
import { calculateOrderFinancials } from "./vendor-payment.types";

export async function createStorePaymentOrder(
  order: {
    id: string;
    orderNumber: string;
    store: { slug: string; vendorId: string };
  },
  totalAmount: number,
  vendorPaymentAccount: {
    razorpayAccountId: string | null;
    status: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    bankVerificationStatus?: string;
    transferEligibleAt?: Date | null;
    routeActivationStatus?: string | null;
  },
  settlementAmount?: number,
): Promise<{ razorpayOrderId: string; keyId: string }> {
  const eligibility = canVendorAcceptOnlinePayments({
    status: vendorPaymentAccount.status,
    chargesEnabled: vendorPaymentAccount.chargesEnabled ?? true,
    payoutsEnabled: vendorPaymentAccount.payoutsEnabled ?? true,
    bankVerificationStatus: vendorPaymentAccount.bankVerificationStatus,
    transferEligibleAt: vendorPaymentAccount.transferEligibleAt,
    routeActivationStatus: vendorPaymentAccount.routeActivationStatus,
  });

  if (!eligibility.eligible) {
    throw new ValidationError(eligibility.reason || "Online payments are not currently active for this vendor store");
  }

  const amountInPaise = Math.round(totalAmount * 100);

  // Deduct the gateway processing fee so the platform retains the fee buffer to pay Razorpay
  const vendorSettlement = settlementAmount ?? calculateOrderFinancials(totalAmount).vendorSettlementAmount;
  const transferAmountInPaise = Math.round(vendorSettlement * 100);

  // Split transfers configuration for Razorpay Route (requires minimum 100 paise = ₹1.00)
  const transfers =
    vendorPaymentAccount.razorpayAccountId &&
    !vendorPaymentAccount.razorpayAccountId.startsWith("acc_sim_") &&
    transferAmountInPaise >= 100
      ? [
          {
            account: vendorPaymentAccount.razorpayAccountId,
            amount: transferAmountInPaise,
            currency: "INR",
            notes: {
              storeOrderId: order.id,
              orderNumber: order.orderNumber,
              vendorId: order.store.vendorId,
            },
            on_hold: 0 as const,
          },
        ]
      : undefined;

  const notes = {
    purpose: "VENDOR_STORE_ORDER",
    storeOrderId: order.id,
    orderNumber: order.orderNumber,
    vendorId: order.store.vendorId,
    storeSlug: order.store.slug,
  };

  const orderPayload: {
    amountInSmallestUnit: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
    transfers?: razorpayClient.RouteTransferInput[];
  } = {
    amountInSmallestUnit: amountInPaise,
    currency: "INR",
    receipt: order.orderNumber,
    notes,
  };

  if (transfers && transfers.length > 0) {
    orderPayload.transfers = transfers;
  }

  const rzpOrder = await razorpayClient.createOrder(orderPayload);

  // Record payment attempt tracking row (Attempt 1, Attempt 2, etc.)
  let attemptNumber = 1;
  try {
    const existingAttempts = await prisma.vendorStorePaymentAttempt.count({
      where: { orderId: order.id },
    });
    attemptNumber = existingAttempts + 1;
    await paymentRepository.recordPaymentAttempt({
      orderId: order.id,
      attemptNumber,
      razorpayOrderId: rzpOrder.orderId,
      amount: totalAmount,
      currency: "INR",
      status: "CREATED",
    });
  } catch (err) {
    logger.warn({ err, orderId: order.id }, "Failed to record VendorStorePaymentAttempt");
  }

  if (transfers && transfers.length > 0 && vendorPaymentAccount.razorpayAccountId) {
    try {
      await paymentRepository.createStoreTransferRecord({
        orderId: order.id,
        vendorId: order.store.vendorId,
        paymentAccountId: (vendorPaymentAccount as any).id,
        razorpayOrderId: rzpOrder.orderId,
        recipientAccountId: vendorPaymentAccount.razorpayAccountId,
        amount: vendorSettlement,
        currency: "INR",
        status: "CREATED",
      });
    } catch (err) {
      logger.warn({ err, orderId: order.id }, "Failed to pre-create VendorStoreTransfer record");
    }
  }

  return {
    razorpayOrderId: rzpOrder.orderId,
    keyId: (env.RAZORPAY_KEY_ID as string) || "rzp_test_placeholder",
  };
}

export async function verifyStorePayment(
  slug: string,
  orderId: string,
  input: VerifyStoreOrderPaymentInput,
) {
  const order = await paymentRepository.findStoreOrderById(orderId);
  if (!order || order.store.slug !== slug) {
    throw new NotFoundError("Order not found");
  }

  if (order.paymentStatus === "CAPTURED") {
    return {
      orderNumber: order.orderNumber,
      paymentStatus: "CAPTURED",
      status: order.status,
      alreadyVerified: true,
    };
  }

  // Verify HMAC-SHA256 signature
  const isValid = razorpayClient.verifyPaymentSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
  );

  if (!isValid) {
    throw new ValidationError("Payment signature verification failed");
  }

  // Verify against Razorpay payment record
  try {
    const rzpPayment = await razorpayClient.fetchPayment(input.razorpayPaymentId);
    if (!rzpPayment || (rzpPayment.status !== "authorized" && rzpPayment.status !== "captured")) {
      throw new ValidationError("Payment has not been authorized by gateway");
    }
  } catch (err) {
    logger.warn({ err, paymentId: input.razorpayPaymentId }, "Gateway payment fetch warning");
  }

  const updated = await paymentRepository.markOrderPaymentCaptured(order.id, {
    razorpayPaymentId: input.razorpayPaymentId,
    paidAt: new Date(),
  });

  try {
    await paymentRepository.updatePaymentAttempt(order.id, input.razorpayOrderId, {
      razorpayPaymentId: input.razorpayPaymentId,
      status: "CAPTURED",
    });
  } catch (err) {
    logger.warn({ err, orderId: order.id }, "Failed to update payment attempt upon verification");
  }

  return {
    orderNumber: updated.orderNumber,
    paymentStatus: updated.paymentStatus,
    status: updated.status,
    alreadyVerified: false,
  };
}

export async function reconcileTransfersForStoreOrder(orderId: string) {
  const order = await paymentRepository.findStoreOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Store order not found");
  }

  if (!order.razorpayOrderId && !order.razorpayPaymentId) {
    return { orderId, reconciled: false, reason: "No payment gateway identifiers found", anomalies: [] };
  }

  let gatewayPayment: any = null;
  let gatewayTransfers: any[] = [];
  const anomalies: string[] = [];

  if (razorpayClient.isPaymentProviderConfigured()) {
    if (order.razorpayPaymentId) {
      try {
        gatewayPayment = await razorpayClient.fetchPayment(order.razorpayPaymentId);
      } catch (err) {
        logger.warn({ err, orderId }, "Failed to fetch gateway payment for reconciliation");
      }

      try {
        const trResponse = await razorpayClient.fetchPaymentTransfers(order.razorpayPaymentId);
        gatewayTransfers = trResponse?.items || [];
      } catch (err) {
        logger.warn({ err, orderId }, "Failed to fetch gateway transfers for reconciliation");
      }
    }
  }

  if (gatewayPayment && (gatewayPayment.status === "captured" || gatewayPayment.status === "authorized")) {
    if (order.paymentStatus !== "CAPTURED") {
      await paymentRepository.markOrderPaymentCaptured(order.id, {
        razorpayPaymentId: gatewayPayment.id,
        paidAt: new Date(gatewayPayment.created_at * 1000),
        actualGatewayFee: typeof gatewayPayment.fee === "number" ? gatewayPayment.fee / 100 : undefined,
      });
    }

    await paymentRepository.updatePaymentAttempt(order.id, order.razorpayOrderId || gatewayPayment.order_id, {
      razorpayPaymentId: gatewayPayment.id,
      status: "CAPTURED",
    });
  }

  for (const tr of gatewayTransfers) {
    const statusMap: Record<string, "CREATED" | "PENDING" | "PROCESSED" | "FAILED" | "REVERSED"> = {
      created: "CREATED",
      pending: "PENDING",
      processed: "PROCESSED",
      failed: "FAILED",
      reversed: "REVERSED",
    };

    const transferStatus = statusMap[tr.status] || "CREATED";
    const providerAmount = tr.amount / 100;
    const providerRecipient = tr.recipient;

    // Detect mismatched recipient account or amount
    if (order.vendorPaymentAccount?.razorpayAccountId && providerRecipient !== order.vendorPaymentAccount.razorpayAccountId) {
      const msg = `Transfer ${tr.id} recipient ${providerRecipient} does not match vendor linked account ${order.vendorPaymentAccount.razorpayAccountId}`;
      logger.error({ orderId, msg }, "Transfer reconciliation anomaly");
      anomalies.push(msg);
    }

    const expectedSettlement = Number(order.vendorSettlementAmount || order.totalAmount);
    if (Math.abs(providerAmount - expectedSettlement) > 1.0) {
      const msg = `Transfer ${tr.id} amount ₹${providerAmount} differs from expected order settlement ₹${expectedSettlement}`;
      logger.warn({ orderId, msg }, "Transfer reconciliation anomaly");
      anomalies.push(msg);
    }

    await paymentRepository.recordOrUpdateStoreTransfer(tr.id, {
      orderId: order.id,
      vendorId: order.store.vendorId,
      recipientAccountId: providerRecipient,
      paymentAccountId: order.vendorPaymentAccountId,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      amount: providerAmount,
      currency: tr.currency || "INR",
      status: transferStatus,
      processedAt: tr.status === "processed" ? new Date() : undefined,
    });

    if (tr.recipient_settlement_id || tr.settlement_id) {
      const settlementId = tr.recipient_settlement_id || tr.settlement_id;
      await paymentRepository.recordOrUpdateStoreSettlement(settlementId, {
        vendorId: order.store.vendorId,
        orderId: order.id,
        recipientAccountId: providerRecipient,
        amount: providerAmount,
        status: tr.status === "processed" ? "PROCESSED" : "PENDING",
        utr: tr.recipient_settlement?.utr || undefined,
        reconciledAt: new Date(),
      });
    }
  }

  return {
    orderId,
    reconciled: true,
    paymentStatus: gatewayPayment?.status || order.paymentStatus,
    transfersCount: gatewayTransfers.length,
    anomalies,
  };
}

export const reconcileStorePaymentOrder = reconcileTransfersForStoreOrder;

export async function syncVendorPaymentAccountFromRazorpay(vendorId: string) {
  const account = await paymentRepository.findPaymentAccountByVendorId(vendorId);
  if (!account || !account.razorpayAccountId) {
    throw new NotFoundError("No linked payment account to sync");
  }

  if (razorpayClient.isPaymentProviderConfigured()) {
    try {
      const rzpAcc = await razorpayClient.fetchAccount(account.razorpayAccountId);
      if (rzpAcc) {
        const isActivated = rzpAcc.status === "activated";
        const routeProduct = rzpAcc.products?.find((p) => p.product_name === "route");
        await paymentRepository.updatePaymentAccountStatus(vendorId, {
          status: isActivated ? "ACTIVE" : (account.status as any),
          razorpayAccountStatus: rzpAcc.status,
          chargesEnabled: Boolean(rzpAcc.charges_enabled ?? isActivated),
          payoutsEnabled: Boolean(rzpAcc.payouts_enabled ?? isActivated),
          routeActivationStatus: routeProduct?.status || account.routeActivationStatus,
          lastProviderSyncAt: new Date(),
        });
      }
    } catch (err) {
      logger.warn({ err, accountId: account.razorpayAccountId }, "Failed to sync account from Razorpay");
    }
  }

  return paymentRepository.findPaymentAccountByVendorId(vendorId);
}

export async function syncVendorPaymentAccount(userId: string) {
  const vendor = await getOwnedVendorOrThrow(userId);
  return syncVendorPaymentAccountFromRazorpay(vendor.id);
}

export async function refundStoreOrder(
  userId: string,
  orderId: string,
  input: RefundStoreOrderInput,
) {
  const vendor = await getOwnedVendorOrThrow(userId);
  const order = await paymentRepository.findStoreOrderById(orderId);

  if (!order || order.store.vendorId !== vendor.id) {
    throw new NotFoundError("Order not found");
  }

  if (order.paymentStatus !== "CAPTURED" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
    throw new ValidationError("Cannot refund an order that has not been paid");
  }

  if (!order.razorpayPaymentId) {
    throw new ValidationError("Order has no captured payment transaction ID");
  }

  const alreadyRefunded = order.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAmount = Number(order.totalAmount);
  const remainingRefundable = totalAmount - alreadyRefunded;

  const refundAmount = input.amount ? Math.min(input.amount, remainingRefundable) : remainingRefundable;
  if (refundAmount <= 0) {
    throw new ValidationError("Order is already fully refunded");
  }

  let razorpayRefundId: string | undefined;

  if (razorpayClient.isPaymentProviderConfigured()) {
    const refundResult = await razorpayClient.createRefund(
      order.razorpayPaymentId,
      Math.round(refundAmount * 100),
      {
        reverseTransfer: true,
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: input.reason || "Vendor initiated refund",
        },
      },
    );
    razorpayRefundId = refundResult.refundId;
  }

  const isFullyRefunded = alreadyRefunded + refundAmount >= totalAmount;

  const refundPayload: {
    razorpayRefundId?: string;
    amount: number;
    reason?: string;
    isFullyRefunded: boolean;
  } = {
    amount: refundAmount,
    isFullyRefunded,
  };

  if (razorpayRefundId) refundPayload.razorpayRefundId = razorpayRefundId;
  if (input.reason) refundPayload.reason = input.reason;

  const result = await paymentRepository.createOrderRefundTx(order.id, refundPayload);

  return {
    refundId: result.refund.id,
    orderId: order.id,
    amount: refundAmount,
    isFullyRefunded,
    paymentStatus: result.updatedOrder.paymentStatus,
  };
}

export async function getVendorPaymentSummary(userId: string): Promise<VendorPaymentMetrics> {
  const vendor = await getOwnedVendorOrThrow(userId);
  return paymentRepository.getVendorPaymentMetrics(vendor.id);
}
