import { describe, expect, it } from "vitest";
import {
  onboardPaymentAccountSchema,
  refundStoreOrderSchema,
  verifyStoreOrderPaymentSchema,
} from "../../src/modules/vendor-payments/vendor-payment.schema";
import {
  calculateOrderFinancials,
  isValidPaymentStatusTransition,
  isValidTransferStatusTransition,
} from "../../src/modules/vendor-payments/vendor-payment.types";
import { canVendorAcceptOnlinePayments } from "../../src/modules/vendor-payments/vendor-payment.service";

describe("Vendor Payment Marketplace Schemas & Calculations", () => {
  it("validates vendor payment account onboarding payload", () => {
    const valid = {
      legalBusinessName: "Royal Kalyanam Floral Enterprises Pvt Ltd",
      businessType: "private_limited",
      contactEmail: "accounts@royalkalyanam.com",
      contactPhone: "9876543210",
      bankName: "HDFC Bank",
      accountNumber: "50200012345678",
      ifscCode: "HDFC0001234",
    };

    const parsed = onboardPaymentAccountSchema.parse(valid);
    expect(parsed.legalBusinessName).toBe("Royal Kalyanam Floral Enterprises Pvt Ltd");
    expect(parsed.ifscCode).toBe("HDFC0001234");
    expect(parsed.accountNumber).toBe("50200012345678");
  });

  it("rejects invalid IFSC code", () => {
    const invalid = {
      legalBusinessName: "Floral Studio",
      businessType: "individual",
      contactEmail: "test@studio.com",
      contactPhone: "9876543210",
      bankName: "SBI",
      accountNumber: "1234567890",
      ifscCode: "INVALID_IFSC",
    };

    expect(() => onboardPaymentAccountSchema.parse(invalid)).toThrow();
  });

  it("rejects non-numeric bank account numbers", () => {
    const invalid = {
      legalBusinessName: "Floral Studio",
      businessType: "individual",
      contactEmail: "test@studio.com",
      contactPhone: "9876543210",
      bankName: "ICICI Bank",
      accountNumber: "ABC12345678",
      ifscCode: "ICIC0001234",
    };

    expect(() => onboardPaymentAccountSchema.parse(invalid)).toThrow();
  });

  it("validates payment verification payload", () => {
    const valid = {
      razorpayPaymentId: "pay_xyz123456789",
      razorpayOrderId: "order_abc987654321",
      razorpaySignature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    };

    const parsed = verifyStoreOrderPaymentSchema.parse(valid);
    expect(parsed.razorpayPaymentId).toBe("pay_xyz123456789");
    expect(parsed.razorpayOrderId).toBe("order_abc987654321");
  });

  it("validates store order refund schema", () => {
    const valid = {
      amount: 2500,
      reason: "Item out of stock after client request",
    };

    const parsed = refundStoreOrderSchema.parse(valid);
    expect(parsed.amount).toBe(2500);
    expect(parsed.reason).toBe("Item out of stock after client request");
  });

  it("calculates zero platform commission and deducts gateway processing fee to prevent platform loss", () => {
    const orderTotal = 10000;

    const financials = calculateOrderFinancials(orderTotal, {
      gatewayFeePercent: 2.36,
      commissionPercent: 0,
    });

    expect(financials.platformCommission).toBe(0);
    expect(financials.gatewayFee).toBe(236);
    expect(financials.vendorSettlementAmount).toBe(9764);
    expect(financials.platformCommission + financials.gatewayFee + financials.vendorSettlementAmount).toBe(orderTotal);
  });

  it("supports future platform commission alongside gateway fee deduction", () => {
    const orderTotal = 10000;

    // Suppose WedHub takes a 5% platform fee in future
    const financials = calculateOrderFinancials(orderTotal, {
      gatewayFeePercent: 2.36,
      commissionPercent: 5,
    });

    expect(financials.platformCommission).toBe(500);
    expect(financials.gatewayFee).toBe(236);
    expect(financials.vendorSettlementAmount).toBe(9264);
    expect(financials.platformCommission + financials.gatewayFee + financials.vendorSettlementAmount).toBe(orderTotal);
  });
});

describe("Razorpay Route Eligibility & Architecture Guardrails", () => {
  it("permits online payments for fully active, verified account outside cooling period", () => {
    const account = {
      status: "ACTIVE",
      chargesEnabled: true,
      payoutsEnabled: true,
      bankVerificationStatus: "VERIFIED",
      routeActivationStatus: "activated",
      transferEligibleAt: new Date(Date.now() - 3600000), // 1 hour ago
    };

    const res = canVendorAcceptOnlinePayments(account);
    expect(res.eligible).toBe(true);
  });

  it("blocks online checkout if account is null or not active", () => {
    expect(canVendorAcceptOnlinePayments(null).eligible).toBe(false);
    expect(canVendorAcceptOnlinePayments(null).code).toBe("NO_ACCOUNT");

    const pending = {
      status: "PENDING_VERIFICATION",
      chargesEnabled: false,
      payoutsEnabled: false,
    };
    const res = canVendorAcceptOnlinePayments(pending);
    expect(res.eligible).toBe(false);
    expect(res.code).toBe("ACCOUNT_NOT_ACTIVE");
  });

  it("blocks online checkout if penny drop test failed", () => {
    const failedBank = {
      status: "ACTIVE",
      chargesEnabled: true,
      payoutsEnabled: true,
      bankVerificationStatus: "FAILED",
    };

    const res = canVendorAcceptOnlinePayments(failedBank);
    expect(res.eligible).toBe(false);
    expect(res.code).toBe("BANK_VERIFICATION_FAILED");
  });

  it("blocks online checkout if Route product is not activated", () => {
    const pendingRoute = {
      status: "ACTIVE",
      chargesEnabled: true,
      payoutsEnabled: true,
      routeActivationStatus: "under_review",
    };

    const res = canVendorAcceptOnlinePayments(pendingRoute);
    expect(res.eligible).toBe(false);
    expect(res.code).toBe("ROUTE_NOT_ACTIVATED");
  });

  it("blocks online checkout if account is in cooling period", () => {
    const inCooling = {
      status: "ACTIVE",
      chargesEnabled: true,
      payoutsEnabled: true,
      transferEligibleAt: new Date(Date.now() + 86400000), // tomorrow
    };

    const res = canVendorAcceptOnlinePayments(inCooling);
    expect(res.eligible).toBe(false);
    expect(res.code).toBe("COOLING_PERIOD");
  });
});

describe("State Machine Transition Protections", () => {
  it("permits standard payment lifecycle transitions", () => {
    expect(isValidPaymentStatusTransition("PENDING", "AUTHORIZED")).toBe(true);
    expect(isValidPaymentStatusTransition("PENDING", "CAPTURED")).toBe(true);
    expect(isValidPaymentStatusTransition("AUTHORIZED", "CAPTURED")).toBe(true);
    expect(isValidPaymentStatusTransition("CAPTURED", "PARTIALLY_REFUNDED")).toBe(true);
    expect(isValidPaymentStatusTransition("CAPTURED", "REFUNDED")).toBe(true);
    expect(isValidPaymentStatusTransition("PARTIALLY_REFUNDED", "REFUNDED")).toBe(true);
  });

  it("blocks invalid payment status backwards transitions", () => {
    expect(isValidPaymentStatusTransition("REFUNDED", "CAPTURED")).toBe(false);
    expect(isValidPaymentStatusTransition("CANCELLED", "PENDING")).toBe(false);
  });

  it("permits valid transfer reversal transitions", () => {
    expect(isValidTransferStatusTransition("CREATED", "PROCESSED")).toBe(true);
    expect(isValidTransferStatusTransition("PROCESSED", "PARTIALLY_REVERSED")).toBe(true);
    expect(isValidTransferStatusTransition("PROCESSED", "REVERSED")).toBe(true);
    expect(isValidTransferStatusTransition("PARTIALLY_REVERSED", "REVERSED")).toBe(true);
  });

  it("blocks invalid transfer backwards transitions", () => {
    expect(isValidTransferStatusTransition("REVERSED", "PROCESSED")).toBe(false);
  });
});
