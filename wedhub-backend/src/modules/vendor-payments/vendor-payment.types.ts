import type { StorePaymentStatus, StoreTransferStatus, VendorPaymentAccountStatus } from "@prisma/client";

export interface OnboardPaymentAccountInput {
  legalBusinessName: string;
  businessType: string; // individual, proprietorship, partnership, private_limited
  contactEmail: string;
  contactPhone: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface VerifyStoreOrderPaymentInput {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface RefundStoreOrderInput {
  amount?: number | undefined;
  reason?: string | undefined;
}

export interface VendorPaymentAccountSummary {
  id: string;
  vendorId: string;
  provider: string;
  razorpayAccountId: string | null;
  status: VendorPaymentAccountStatus;
  legalBusinessName: string | null;
  businessType: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  bankName: string | null;
  accountNumberMasked: string | null;
  ifscCode: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  bankVerificationStatus?: string;
  routeActivationStatus?: string | null;
  transferEligibleAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorPaymentMetrics {
  totalGmv: number;
  totalRevenue?: number;
  totalPaidOrders: number;
  completedSettlementAmount: number;
  settledAmount?: number;
  transferredAmount?: number;
  pendingSettlementAmount: number;
  pendingSettlement?: number;
  totalRefundedAmount: number;
  refundedAmount?: number;
  platformCommission?: number;
}

/**
 * Standard Payment Gateway processing fee in India (2% + 18% GST = ~2.36%).
 * This is deducted from the vendor's transfer so the platform retains the fee
 * buffer to cover payment processing charges, ensuring the platform loses ₹0.
 */
export const DEFAULT_GATEWAY_FEE_PERCENT = 2.36;

export function calculateOrderFinancials(
  totalAmount: number,
  options?: {
    gatewayFeePercent?: number;
    commissionPercent?: number;
  },
) {
  const feePercent = options?.gatewayFeePercent ?? DEFAULT_GATEWAY_FEE_PERCENT;
  const commissionPercent = options?.commissionPercent ?? 0;

  const gatewayFee = Math.round((totalAmount * feePercent) / 100);
  const platformCommission = Math.round((totalAmount * commissionPercent) / 100);
  const totalDeductions = gatewayFee + platformCommission;
  const vendorSettlementAmount = Math.max(0, totalAmount - totalDeductions);

  return {
    totalAmount,
    gatewayFee,
    platformCommission,
    vendorSettlementAmount,
  };
}

export function isValidPaymentStatusTransition(
  current: StorePaymentStatus,
  next: StorePaymentStatus,
): boolean {
  if (current === next) return true;
  const transitions: Record<StorePaymentStatus, StorePaymentStatus[]> = {
    CREATED: ["PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED"],
    PENDING: ["AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED"],
    AUTHORIZED: ["CAPTURED", "FAILED", "CANCELLED"],
    CAPTURED: ["PARTIALLY_REFUNDED", "REFUNDED"],
    PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
    REFUNDED: [],
    FAILED: ["AUTHORIZED", "CAPTURED"],
    CANCELLED: [],
  };

  return transitions[current]?.includes(next) ?? false;
}

export function isValidTransferStatusTransition(
  current: StoreTransferStatus,
  next: StoreTransferStatus,
): boolean {
  if (current === next) return true;
  const transitions: Record<StoreTransferStatus, StoreTransferStatus[]> = {
    CREATED: ["PENDING", "PROCESSED", "FAILED"],
    PENDING: ["PROCESSED", "FAILED"],
    PROCESSED: ["REVERSED", "PARTIALLY_REVERSED"],
    FAILED: ["PENDING", "PROCESSED"],
    REVERSED: [],
    PARTIALLY_REVERSED: ["REVERSED"],
  };

  return transitions[current]?.includes(next) ?? false;
}
