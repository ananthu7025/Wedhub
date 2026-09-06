"use client";

import { useState } from "react";
import { updateMyStoreProfile } from "@/lib/api/vendor-store-client";
import type { StoreAccentColor, VendorStoreProfile } from "@/lib/api/vendor-store.types";
import { STORE_ACCENT_COLOR_LABELS, STORE_THEMES } from "@/components/vendor-store/store-theme";

const ACCENT_COLOR_OPTIONS: StoreAccentColor[] = ["CRIMSON", "EMERALD", "NAVY", "AMBER", "PLUM", "SLATE"];

export function StoreProfileForm({
  initialProfile,
}: {
  initialProfile: VendorStoreProfile;
}) {
  const [profile, setProfile] = useState<VendorStoreProfile>(initialProfile);
  const [storeName, setStoreName] = useState(initialProfile.storeName ?? "");
  const [tagline, setTagline] = useState(initialProfile.tagline ?? "");
  const [aboutStore, setAboutStore] = useState(initialProfile.aboutStore ?? "");
  const [isEnabled, setIsEnabled] = useState(initialProfile.isEnabled);
  const [whatsappOrderPhone, setWhatsappOrderPhone] = useState(
    initialProfile.whatsappOrderPhone ?? "",
  );
  const [shippingPolicy, setShippingPolicy] = useState(
    initialProfile.shippingPolicy ?? "",
  );
  const [returnPolicy, setReturnPolicy] = useState(
    initialProfile.returnPolicy ?? "",
  );
  const [minOrderValue, setMinOrderValue] = useState<number | string>(
    initialProfile.minOrderValue ?? "",
  );
  const [accentColor, setAccentColor] = useState<StoreAccentColor>(
    initialProfile.accentColor ?? "CRIMSON",
  );

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const minValNum = minOrderValue === "" ? null : Number(minOrderValue);

    const res = await updateMyStoreProfile({
      storeName: storeName.trim() || undefined,
      tagline: tagline.trim() || null,
      aboutStore: aboutStore.trim() || null,
      isEnabled,
      whatsappOrderPhone: whatsappOrderPhone.trim() || null,
      shippingPolicy: shippingPolicy.trim() || null,
      returnPolicy: returnPolicy.trim() || null,
      minOrderValue: minValNum,
      accentColor,
    });

    setSaving(false);
    if (!res.success) {
      setErrorMsg(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to update store settings",
      );
      return;
    }

    setProfile(res.data);
    setSuccessMsg("Store settings updated successfully!");
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!profile.isEligible && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-bold">Category Store Status: Gated</h4>
              <p className="mt-1 text-xs leading-relaxed">
                Your primary category does not have the direct-order store capability enabled by the platform admin yet. You can configure your store details in advance, but items and orders will remain inactive until category store access is turned on by an administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Main Settings Card */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h3 className="text-base font-bold text-text-dark border-b border-border pb-3 mb-5">
          General Store Identity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Store Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Aiswarya Floral & Decors"
              maxLength={150}
              required
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-text-grey">
              The customer-facing title for your storefront header.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Storefront Status
            </label>
            <div className="flex items-center gap-3 pt-1">
              <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-emerald-600" />
                <span className="absolute left-[3px] h-4.5 w-4.5 rounded-full bg-white transition-transform peer-checked:translate-x-[20px]" />
              </label>
              <span className="text-sm font-medium text-text-dark">
                {isEnabled ? "Store Active & Accepting Orders" : "Store Disabled / On Vacation"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-grey">
              Toggle off to pause your storefront anytime.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Store Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Handcrafted floral garlands, bridal bouquets & fresh wedding decor"
              maxLength={300}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-grey mb-1">
              About the Store
            </label>
            <textarea
              rows={3}
              value={aboutStore}
              onChange={(e) => setAboutStore(e.target.value)}
              placeholder="Tell couples about your artisan crafts, production timeline, ingredients, or custom ordering details..."
              maxLength={5000}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-grey mb-2">
              Store Accent Color
            </label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLOR_OPTIONS.map((option) => {
                const theme = STORE_THEMES[option];
                const isSelected = accentColor === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAccentColor(option)}
                    title={STORE_ACCENT_COLOR_LABELS[option]}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors ${
                      isSelected ? "border-text-dark" : "border-transparent hover:border-border"
                    }`}
                  >
                    <span
                      className={`h-8 w-8 rounded-full ${theme.accentBgClass} ${
                        isSelected ? "ring-2 ring-offset-2 ring-text-dark" : ""
                      }`}
                    />
                    <span className="text-[11px] font-medium text-text-grey">
                      {STORE_ACCENT_COLOR_LABELS[option]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-text-grey">
              Used for buttons, links, and checkout on your public storefront.
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp & Checkout Settings */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h3 className="text-base font-bold text-text-dark border-b border-border pb-3 mb-5">
          WhatsApp Ordering & Fulfillment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              WhatsApp Order Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-text-grey">📱</span>
              <input
                type="tel"
                value={whatsappOrderPhone}
                onChange={(e) => setWhatsappOrderPhone(e.target.value)}
                placeholder="9876543210 or +91 98765 43210"
                className="w-full rounded-lg border border-border pl-9 pr-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-text-grey">
              Incoming customer orders and cart confirmations will be sent directly to this WhatsApp number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Minimum Order Value (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-text-grey">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                placeholder="e.g. 500 (leave blank for no minimum)"
                className="w-full rounded-lg border border-border pl-8 pr-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-text-grey">
              Carts below this amount cannot place an order.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Shipping & Delivery Policy
            </label>
            <textarea
              rows={3}
              value={shippingPolicy}
              onChange={(e) => setShippingPolicy(e.target.value)}
              placeholder="e.g. Free local delivery across Ernakulam for orders above ₹2000. Outstation delivery via express courier within 2-3 days."
              maxLength={3000}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Cancellation & Return Policy
            </label>
            <textarea
              rows={3}
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              placeholder="e.g. Customized wedding items and perishable flowers are non-returnable. Cancellations accepted up to 48 hours prior to event."
              maxLength={3000}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? "Saving Changes…" : "Save Store Profile"}
        </button>
      </div>
    </form>
  );
}
