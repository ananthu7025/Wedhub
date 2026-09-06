"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyVendorDetail, upsertMyProfile } from "@/lib/api/vendor-self-client";
import { updateMyProfile } from "@/lib/api/users-client";
import { setNotificationPreference } from "@/lib/api/notification-preferences-client";
import { deactivateAccount } from "@/lib/api/account-client";
import { logout } from "@/lib/api/auth-client";
import type { VendorSelf } from "@/lib/api/vendor-self.types";
import type { MeResponse } from "@/lib/api/account.types";
import type { NotificationChannel, NotificationEventType, NotificationPreference } from "@/lib/api/notification-preferences.types";
import { formatApiError } from "@/lib/utils/error";

/**
 * Settings page (Frontend Arch Phase 7), matching
 * wedhub-frontend/vendor/settings.html's business-info + notification
 * preferences + danger-zone sections. The mockup's "Team members" section
 * is omitted entirely — confirmed via backend research that no team/staff
 * model exists anywhere (Vendor.ownerUserId is a single nullable FK, no
 * multi-user-per-vendor concept), so there is nothing real to build
 * against (per user decision, 2026-09-02).
 *
 * "Deactivate listing" is relabeled honestly as "Deactivate account" and
 * reuses the same generic POST /users/me/deactivate the couple account
 * page already calls — confirmed via research that this deactivates the
 * LOGIN (User.status), not the vendor listing itself (no code path
 * anywhere sets Vendor.status = DEACTIVATED, despite that enum value
 * existing on the schema). The mockup's copy ("hidden from search
 * results... reactivate") describes behavior the backend doesn't actually
 * implement, so this UI describes what really happens instead.
 */

const NOTIFICATION_TOGGLES: Array<{ eventType: NotificationEventType; channel: NotificationChannel; label: string; description: string }> = [
  { eventType: "NEW_LEAD", channel: "EMAIL", label: "New lead alerts (email)", description: "Get notified by email the moment a couple enquires" },
  { eventType: "NEW_LEAD", channel: "IN_APP", label: "New lead alerts (in-app)", description: "Show new-lead alerts inside the vendor dashboard" },
  { eventType: "REVIEW_RECEIVED", channel: "EMAIL", label: "Review alerts (email)", description: "Get notified by email when a couple leaves a review" },
  { eventType: "VENDOR_APPROVED", channel: "EMAIL", label: "Listing status updates (email)", description: "Approval, rejection, and verification updates" },
  { eventType: "SUBSCRIPTION_ACTIVATED", channel: "EMAIL", label: "Billing receipts (email)", description: "Payment confirmations and subscription updates" },
  { eventType: "PAYMENT_FAILED", channel: "EMAIL", label: "Payment failure alerts (email)", description: "Get notified immediately if a payment fails" },
];

function isEnabled(preferences: NotificationPreference[], eventType: NotificationEventType, channel: NotificationChannel): boolean {
  const row = preferences.find((p) => p.eventType === eventType && p.channel === channel);
  // Opt-out model: no row means enabled (see notification-preferences.types.ts).
  return row ? row.isEnabled : true;
}

export function SettingsBoard({
  vendor,
  me,
  initialPreferences,
}: {
  vendor: VendorSelf;
  me: MeResponse;
  initialPreferences: NotificationPreference[];
}) {
  const router = useRouter();

  const [businessName, setBusinessName] = useState(vendor.businessName);
  const [firstName, setFirstName] = useState(me.profile?.firstName ?? "");
  const [lastName, setLastName] = useState(me.profile?.lastName ?? "");
  const [phone, setPhone] = useState(vendor.profile?.phone ?? "");
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessSaved, setBusinessSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState(initialPreferences);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);

  const [deactivating, setDeactivating] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  async function handleSaveBusiness(event: React.FormEvent) {
    event.preventDefault();
    setSavingBusiness(true);
    setBusinessSaved(false);
    setSaveError(null);
    // firstName/lastName/phone are optional on the backend but reject an
    // empty string outright (min(1)/min(6)) — omit rather than send "" for
    // a field the vendor never filled in, so an unrelated blank field
    // (e.g. no phone on file yet) can't silently fail every save, business
    // name included. Previously always sent, always 400'd for a vendor who
    // never filled these in during onboarding, with no error surfaced.
    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone.length < 6) {
      setSaveError("Phone number must be at least 6 characters.");
      setSavingBusiness(false);
      return;
    }

    const [vendorResult, userResult, profileResult] = await Promise.all([
      businessName.trim() !== vendor.businessName ? updateMyVendorDetail({ businessName: businessName.trim() }) : Promise.resolve({ success: true as const, data: null }),
      updateMyProfile({ firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined }),
      upsertMyProfile({ phone: trimmedPhone || undefined }),
    ]);
    setSavingBusiness(false);
    if (vendorResult.success && userResult.success && profileResult.success) {
      setBusinessSaved(true);
      setTimeout(() => setBusinessSaved(false), 2000);
      return;
    }
    const firstError = [vendorResult, userResult, profileResult].find((r) => !r.success);
    setSaveError(firstError && !firstError.success ? formatApiError(firstError.error) : "Could not save your changes.");
  }

  async function handleToggle(eventType: NotificationEventType, channel: NotificationChannel, nextValue: boolean) {
    const key = `${eventType}:${channel}`;
    setSavingToggle(key);
    setSaveError(null);
    const result = await setNotificationPreference({ eventType, channel, isEnabled: nextValue });
    setSavingToggle(null);
    if (result.success) {
      setPreferences((prev) => {
        const existing = prev.find((p) => p.eventType === eventType && p.channel === channel);
        if (existing) return prev.map((p) => (p === existing ? result.data : p));
        return [...prev, result.data];
      });
    } else {
      setSaveError(formatApiError(result.error));
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    setSaveError(null);
    const result = await deactivateAccount();
    if (result.success) {
      await logout();
      router.push("/login");
      return;
    }
    setDeactivating(false);
    setSaveError(formatApiError(result.error));
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
        <p className="text-xs sm:text-sm text-text-grey">Manage your business account and notifications.</p>
      </div>

      {saveError && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{saveError}</div>}

      <form onSubmit={handleSaveBusiness} className="mb-5 rounded-xl border border-border bg-white p-4 sm:p-6 shadow-xs">
        <h3 className="mb-4 text-base font-bold">Business account info</h3>
        <div className="mb-4 grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Business name</span>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={200}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Owner first name</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Owner last name</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Email</span>
            <input type="email" value={me.email} disabled className="w-full rounded-md border border-border bg-surface-input px-3 py-2 text-sm text-text-grey" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Business phone</span>
            <input
              type="tel"
              minLength={6}
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
        </div>
        {saveError && <p className="mb-3 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{saveError}</p>}
        <button
          type="submit"
          disabled={savingBusiness}
          className="w-full sm:w-auto rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-xs disabled:opacity-60"
        >
          {savingBusiness ? "Saving…" : businessSaved ? "Saved ✓" : "Save changes"}
        </button>
      </form>

      <div className="mb-5 rounded-xl border border-border bg-white p-6">
        <h3 className="mb-4 text-base font-bold">Notification preferences</h3>
        {NOTIFICATION_TOGGLES.map(({ eventType, channel, label, description }) => {
          const key = `${eventType}:${channel}`;
          const checked = isEnabled(preferences, eventType, channel);
          return (
            <div key={key} className="flex items-center justify-between border-b border-neutral-grey-20 py-3.5 last:border-b-0">
              <div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-text-grey">{description}</div>
              </div>
              <label className="relative inline-flex h-[22px] w-10 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={savingToggle === key}
                  onChange={(e) => handleToggle(eventType, channel, e.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-brand-primary" />
                <span className="absolute left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
              </label>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-red-10 bg-white p-6">
        <h3 className="mb-3 text-base font-bold text-red-70">Danger zone</h3>
        <p className="mb-4 text-[13.5px] text-text-grey">
          Deactivating your account signs you out and disables login. Your vendor listing and its data are not
          deleted, but you won&apos;t be able to access this dashboard again unless support reactivates your account.
        </p>
        {confirmingDeactivate ? (
          <div className="flex gap-2">
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {deactivating ? "Deactivating…" : "Yes, deactivate my account"}
            </button>
            <button
              onClick={() => setConfirmingDeactivate(false)}
              className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDeactivate(true)}
            className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white"
          >
            Deactivate account
          </button>
        )}
      </div>
    </div>
  );
}
