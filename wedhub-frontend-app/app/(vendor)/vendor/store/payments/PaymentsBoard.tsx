"use client";

import { useState } from "react";
import type {
  VendorPaymentAccountSummary,
  VendorPaymentMetrics,
  VendorStoreOrder,
  OnboardPaymentAccountInput,
} from "@/lib/api/vendor-store.types";
import {
  onboardMyPaymentAccount,
  getKycOnboardingLink,
  syncMyPaymentAccount,
  refundStoreOrder,
} from "@/lib/api/vendor-payments-client";

export function PaymentsBoard({
  initialAccount,
  initialMetrics,
  initialOrders,
}: {
  initialAccount: VendorPaymentAccountSummary | null;
  initialMetrics: VendorPaymentMetrics | null;
  initialOrders: VendorStoreOrder[];
}) {
  const [account, setAccount] = useState<VendorPaymentAccountSummary | null>(initialAccount);
  const [metrics, setMetrics] = useState<VendorPaymentMetrics | null>(initialMetrics);
  const [orders, setOrders] = useState<VendorStoreOrder[]>(initialOrders);

  // Connect / Update Account Form State
  const [showConnectForm, setShowConnectForm] = useState(!initialAccount);
  const [businessName, setBusinessName] = useState(initialAccount?.legalBusinessName ?? "");
  const [businessType, setBusinessType] = useState(initialAccount?.businessType ?? "individual");
  const [email, setEmail] = useState(initialAccount?.contactEmail ?? "");
  const [phone, setPhone] = useState(initialAccount?.contactPhone ?? "");
  const [bankName, setBankName] = useState(initialAccount?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState(initialAccount?.ifscCode ?? "");

  const [savingAccount, setSavingAccount] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  async function handleSyncAccount() {
    setSyncing(true);
    setAccountError(null);
    const res = await syncMyPaymentAccount();
    setSyncing(false);
    if (res.success && res.data) {
      setAccount(res.data);
      setAccountSuccess("Account status synchronized with Razorpay.");
    } else if (!res.success) {
      setAccountError(
        typeof res.error === "string" ? res.error : res.error?.message || "Failed to sync status from gateway.",
      );
    }
  }

  async function handleOpenKyc() {
    setKycLoading(true);
    setAccountError(null);
    const res = await getKycOnboardingLink();
    setKycLoading(false);
    if (res.success && res.data?.shortUrl) {
      window.open(res.data.shortUrl, "_blank", "noopener,noreferrer");
    } else if (!res.success) {
      setAccountError(
        typeof res.error === "string" ? res.error : res.error?.message || "Could not generate KYC link. Please verify your account status.",
      );
    }
  }

  // Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<VendorStoreOrder | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  async function handleConnectAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    if (accountNumber !== confirmAccountNumber) {
      setAccountError("Account numbers do not match. Please verify.");
      return;
    }

    if (!ifscCode.trim() || ifscCode.trim().length !== 11) {
      setAccountError("Please enter a valid 11-character IFSC code.");
      return;
    }

    setSavingAccount(true);

    const input: OnboardPaymentAccountInput = {
      legalBusinessName: businessName.trim(),
      businessType,
      contactEmail: email.trim().toLowerCase(),
      contactPhone: phone.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
    };

    const res = await onboardMyPaymentAccount(input);
    setSavingAccount(false);

    if (!res.success) {
      setAccountError(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to connect bank account. Please check details.",
      );
      return;
    }

    setAccount(res.data);
    setShowConnectForm(false);
    setAccountNumber("");
    setConfirmAccountNumber("");
    setAccountSuccess("Bank account details submitted! Your account is undergoing verification with Razorpay (KYC / penny drop). Online payments will activate as soon as validation completes.");
  }

  async function handleRefundSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!refundModalOrder) return;

    setRefundError(null);
    const parsedAmount = refundAmount ? parseFloat(refundAmount) : undefined;

    if (parsedAmount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setRefundError("Please enter a valid refund amount.");
      return;
    }

    setRefunding(true);

    const res = await refundStoreOrder(refundModalOrder.id, {
      amount: parsedAmount,
      reason: refundReason.trim() || undefined,
    });

    setRefunding(false);

    if (!res.success) {
      setRefundError(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to process refund. Please verify payment status.",
      );
      return;
    }

    // Update orders in state
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === refundModalOrder.id
          ? {
              ...ord,
              paymentStatus: res.data.isFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
              refunds: [
                ...(ord.refunds ?? []),
                {
                  id: res.data.refundId,
                  amount: res.data.amount,
                  reason: refundReason.trim() || null,
                  status: "PROCESSED",
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : ord,
      ),
    );

    // Update metrics
    if (metrics) {
      setMetrics({
        ...metrics,
        refundedAmount: metrics.refundedAmount + res.data.amount,
        settledAmount: Math.max(0, metrics.settledAmount - res.data.amount),
      });
    }

    setRefundModalOrder(null);
    setRefundAmount("");
    setRefundReason("");
  }

  const isFullyActive = Boolean(account && account.status === "ACTIVE" && account.chargesEnabled && account.payoutsEnabled);
  const isPendingVerification = Boolean(account && account.status === "PENDING_VERIFICATION");

  return (
    <div className="space-y-6">
      {/* Zero Commission Marketplace Banner */}
      <div className="rounded-2xl bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>✨</span> 0% WedHub Commission
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Direct Bank Settlements via Razorpay Route
          </h2>
          <p className="mt-2 text-sm text-emerald-50 leading-relaxed">
            WedHub does not hold your money. When couples pay online for your products, floral arrangements, or packages, funds settle straight to your verified bank account.
          </p>
        </div>
      </div>

      {accountSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span>{accountSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setAccountSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-text-grey uppercase tracking-wider">
            Total Sales
          </div>
          <div className="mt-1.5 text-xl font-black text-text-dark">
            ₹{(metrics?.totalRevenue ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] text-text-grey">
            {metrics?.totalPaidOrders ?? 0} paid online orders
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-text-grey uppercase tracking-wider">
            Transferred
          </div>
          <div className="mt-1.5 text-xl font-black text-emerald-600">
            ₹{(metrics?.transferredAmount ?? metrics?.settledAmount ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] text-emerald-700">
            To Linked Account
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-text-grey uppercase tracking-wider">
            Settlement Pending
          </div>
          <div className="mt-1.5 text-xl font-black text-blue-600">
            ₹{(metrics?.pendingSettlement ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] text-blue-700">
            Clearing in transit
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-text-grey uppercase tracking-wider">
            Settled (Bank)
          </div>
          <div className="mt-1.5 text-xl font-black text-teal-700">
            ₹{(metrics?.settledAmount ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] text-teal-800">
            UTR confirmed
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-text-grey uppercase tracking-wider">
            Refunds
          </div>
          <div className="mt-1.5 text-xl font-black text-amber-600">
            ₹{(metrics?.refundedAmount ?? 0).toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] text-text-grey">
            Reversed to buyers
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-text-grey uppercase tracking-wider">
            Commission
          </div>
          <div className="mt-1.5 text-xl font-black text-emerald-700">
            ₹0 (0%)
          </div>
          <div className="mt-1 text-[10px] text-emerald-800">
            Direct settlement
          </div>
        </div>
      </div>

      {/* Bank Account Connection Status / Form */}
      <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-text-dark flex items-center gap-2">
              <span>Linked Bank Account</span>
              {isFullyActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Online Payments Active
                </span>
              ) : account?.routeActivationStatus === "needs_clarification" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                  Additional Information Required
                </span>
              ) : account?.status === "RESTRICTED" || account?.status === "DISABLED" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                  Restricted
                </span>
              ) : isPendingVerification ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Verification Pending
                </span>
              ) : account?.status === "ONBOARDING" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                  Setup in Progress
                </span>
              ) : account ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-800">
                  {account.status}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-input px-2.5 py-0.5 text-[11px] font-bold text-text-grey">
                  Not Connected
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-text-grey">
              Required for automated customer payouts and instant order capture.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {account && (
              <button
                type="button"
                onClick={handleSyncAccount}
                disabled={syncing}
                title="Synchronize linked account status from Razorpay"
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-text-dark hover:bg-surface-input transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className={syncing ? "animate-spin" : ""}>🔄</span>
                <span>{syncing ? "Syncing…" : "Sync Status"}</span>
              </button>
            )}
            {account && !isFullyActive && (
              <button
                type="button"
                onClick={handleOpenKyc}
                disabled={kycLoading}
                className="rounded-xl bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-secondary transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                <span>{kycLoading ? "Opening…" : "Complete Digital KYC"}</span>
                <span className="text-[10px]">↗</span>
              </button>
            )}
            {account && !showConnectForm && (
              <button
                type="button"
                onClick={() => setShowConnectForm(true)}
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-text-dark hover:bg-surface-input transition-colors"
              >
                Update Bank Details
              </button>
            )}
            {account && showConnectForm && (
              <button
                type="button"
                onClick={() => setShowConnectForm(false)}
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-text-grey hover:text-text-dark transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {account && !showConnectForm ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="text-[11px] font-semibold text-text-grey uppercase">Legal Business / Entity</div>
                <div className="mt-1 text-sm font-bold text-text-dark">{account.legalBusinessName}</div>
                <div className="text-xs text-text-grey capitalize">{account.businessType}</div>
              </div>
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="text-[11px] font-semibold text-text-grey uppercase">Bank & Account</div>
                <div className="mt-1 text-sm font-bold text-text-dark">{account.bankName}</div>
                <div className="text-xs font-mono text-text-grey">{account.accountNumberMasked}</div>
              </div>
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="text-[11px] font-semibold text-text-grey uppercase">Bank Verification</div>
                <div className="mt-1">
                  {account.bankVerificationStatus === "VERIFIED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      ✓ Penny Drop Verified
                    </span>
                  ) : account.bankVerificationStatus === "FAILED" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                      ✕ Penny Drop Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                      ⏳ Pending Validation
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] font-mono text-text-grey">{account.ifscCode}</div>
              </div>
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="text-[11px] font-semibold text-text-grey uppercase">Route Status & ID</div>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                    account.routeActivationStatus === "activated" || isFullyActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {account.routeActivationStatus || (isFullyActive ? "Activated" : "Requested")}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-text-grey truncate">
                  {account.razorpayAccountId || "Direct Settlement"}
                </div>
              </div>
            </div>

            {account.transferEligibleAt && new Date() < new Date(account.transferEligibleAt) && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 flex items-center gap-3">
                <span className="text-xl">🕒</span>
                <div>
                  <p className="font-bold">Standard Account Cooling Period Active</p>
                  <p className="mt-0.5 text-blue-700">
                    Following initial bank activation, payout transfers are held until{" "}
                    <strong>{new Date(account.transferEligibleAt).toLocaleString("en-IN")}</strong>. Orders placed will settle automatically once the cooling period concludes.
                  </p>
                </div>
              </div>
            )}

            {account.bankVerificationStatus === "FAILED" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span> Bank Verification Test Failed
                  </p>
                  <p className="mt-0.5 text-rose-700 leading-relaxed">
                    Razorpay could not verify your bank account with the penny test. Please click &ldquo;Update Bank Details&rdquo; to re-check your account number and IFSC code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConnectForm(true)}
                  className="shrink-0 rounded-xl bg-rose-600 px-3.5 py-2 font-bold text-white hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Update Account
                </button>
              </div>
            )}

            {isPendingVerification && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⏳</span> Bank Verification & KYC in Progress
                  </p>
                  <p className="mt-0.5 text-amber-700 leading-relaxed">
                    Razorpay is verifying your bank account credentials (penny testing / KYC review). While verification is pending, online checkout on your storefront is temporarily held to protect payouts. WhatsApp orders remain active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenKyc}
                  disabled={kycLoading}
                  className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 font-bold text-white hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-xs"
                >
                  {kycLoading ? "Opening…" : "Complete Digital KYC ↗"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleConnectAccount} className="space-y-4 max-w-2xl">
            {accountError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                {accountError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Legal Entity / Beneficiary Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Dream Weddings Pvt Ltd or John Doe"
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Business Structure <span className="text-red-500">*</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                >
                  <option value="individual">Individual / Freelancer</option>
                  <option value="proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership / LLP</option>
                  <option value="private_limited">Private Limited (Pvt Ltd)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Finance Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="finance@vendor.com"
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Finance Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="HDFC Bank / SBI / ICICI"
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter Bank Account No"
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Confirm Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  placeholder="Re-enter Account No"
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-dark mb-1">
                Bank IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                className="w-full max-w-xs rounded-xl border border-border px-3.5 py-2 text-xs font-mono uppercase focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={savingAccount}
                className="rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-sm"
              >
                {savingAccount ? "Connecting via Route…" : "Save & Activate Online Payments"}
              </button>

              {account && (
                <button
                  type="button"
                  onClick={() => setShowConnectForm(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-text-grey hover:bg-surface-input"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Transactions & Settlements History */}
      <div className="rounded-2xl border border-border bg-surface-card p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-text-dark">Online Orders & Payment Ledger</h3>
          <p className="text-xs text-text-grey">
            Real-time record of all orders paid through online gateway with transfer & refund controls.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-surface-input flex items-center justify-center text-lg mb-2">
              💳
            </div>
            <p className="text-xs font-semibold text-text-dark">No online transactions yet</p>
            <p className="text-[11px] text-text-grey mt-1">
              Once buyers purchase from your store using online payments, settlements and transaction IDs will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-input/50 text-[11px] font-bold uppercase text-text-grey">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Payment Status</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Settlement</th>
                  <th className="py-3 px-3">Gateway Ref</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((ord) => {
                  const isPaid = ord.paymentStatus === "CAPTURED";
                  const isPartiallyRefunded = ord.paymentStatus === "PARTIALLY_REFUNDED";
                  const isRefunded = ord.paymentStatus === "REFUNDED";

                  return (
                    <tr key={ord.id} className="hover:bg-surface-input/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-primary">
                        #{ord.orderNumber}
                      </td>
                      <td className="py-3 px-3 text-text-grey">
                        {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text-dark">{ord.customerName}</div>
                        <div className="text-[11px] text-text-grey">{ord.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3">
                        {isPaid && (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                            CAPTURED
                          </span>
                        )}
                        {isPartiallyRefunded && (
                          <span className="rounded-full bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[10px]">
                            PARTIAL REFUND
                          </span>
                        )}
                        {isRefunded && (
                          <span className="rounded-full bg-red-100 text-red-800 font-bold px-2 py-0.5 text-[10px]">
                            REFUNDED
                          </span>
                        )}
                        {!isPaid && !isPartiallyRefunded && !isRefunded && (
                          <span className="rounded-full bg-surface-input text-text-grey font-bold px-2 py-0.5 text-[10px]">
                            {ord.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-text-dark">
                        ₹{ord.totalAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-600">
                        ₹{(ord.vendorSettlementAmount ?? ord.totalAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-text-grey">
                        {ord.razorpayPaymentId ?? "—"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {(isPaid || isPartiallyRefunded) && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundModalOrder(ord);
                              setRefundAmount("");
                              setRefundReason("");
                              setRefundError(null);
                            }}
                            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-text-grey hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-dark">
                Issue Refund for #{refundModalOrder.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="text-text-grey hover:text-text-dark p-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-surface-input p-3 text-xs space-y-1">
              <div className="flex justify-between text-text-grey">
                <span>Customer</span>
                <span className="font-semibold text-text-dark">{refundModalOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-text-grey">
                <span>Order Total</span>
                <span className="font-semibold text-text-dark">₹{refundModalOrder.totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-text-grey">
                <span>Settled to Your Bank</span>
                <span className="font-semibold text-emerald-600">₹{(refundModalOrder.vendorSettlementAmount ?? refundModalOrder.totalAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-text-grey">
                <span>Payment Gateway Fee (2% + GST)</span>
                <span className="font-semibold text-text-dark">₹{(refundModalOrder.gatewayFee ?? 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-text-grey">
                <span>Gateway Payment Ref</span>
                <span className="font-mono text-text-dark">{refundModalOrder.razorpayPaymentId}</span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold">Banking Network Note:</span> When issuing a refund, funds are reverse-transferred from your linked account to the customer. Per banking & Razorpay network policies, payment gateway processing charges (~2.36%) are retained by the payment network and are non-refundable.
            </div>

            {refundError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600">
                {refundError}
              </div>
            )}

            <form onSubmit={handleRefundSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder={`Leave blank for full refund (₹${refundModalOrder.totalAmount})`}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-text-grey">
                  Funds are automatically reverse-transferred from your linked account to customer payment source.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dark mb-1">
                  Reason for Refund (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested cancellation, out of stock"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-grey hover:bg-surface-input"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refunding}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {refunding ? "Processing Refund…" : "Confirm Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
