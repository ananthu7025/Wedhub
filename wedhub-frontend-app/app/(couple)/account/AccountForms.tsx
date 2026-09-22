"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deactivateAccount, deleteAccount, updateWeddingProfile } from "@/lib/api/account-client";
import { updateMyProfile } from "@/lib/api/users-client";
import { logout, refreshSession } from "@/lib/api/auth-client";
import { setNotificationPreference } from "@/lib/api/notification-preferences-client";
import type { MeResponse } from "@/lib/api/account.types";
import type { NotificationChannel, NotificationEventType, NotificationPreference } from "@/lib/api/notification-preferences.types";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function WeddingDetailsForm({ me }: { me: MeResponse }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [weddingDate, setWeddingDate] = useState(toDateInputValue(me.weddingProfile?.weddingDate ?? null));
  const [partnerName, setPartnerName] = useState(me.weddingProfile?.partnerName ?? "");
  const [guestCount, setGuestCount] = useState(me.weddingProfile?.guestCount?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState<{ weddingDate?: boolean }>({});

  // Same isNaN(d.getTime()) validity check as before, just evaluated on every
  // keystroke via useMemo so the field can show a red border + inline message
  // once touched, instead of only surfacing the problem on submit.
  const dateError = useMemo(() => {
    if (!weddingDate) return null;
    const d = new Date(weddingDate);
    return isNaN(d.getTime()) ? "Please enter a valid wedding date" : null;
  }, [weddingDate]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ weddingDate: true });
    setSaved(false);

    if (dateError) return;

    let parsedDate: string | undefined = undefined;
    if (weddingDate) {
      parsedDate = new Date(weddingDate).toISOString();
    }

    setSaving(true);
    const body = {
      weddingDate: parsedDate,
      partnerName: partnerName.trim() || undefined,
      guestCount: guestCount ? Number(guestCount) : undefined,
    };
    let result = await updateWeddingProfile(body);

    // The access token can carry a stale emailVerified: false claim if the
    // user verified their email in another tab/device since their last
    // login/refresh (see require-verified.middleware.ts's staleness
    // tradeoff comment). refreshSession() re-reads emailVerifiedAt from the
    // database and re-mints the token — retry once before showing an error
    // to an already-verified user. Mirrors VerifyEmailPendingPanel.tsx.
    if (!result.success && result.error?.code === "EMAIL_NOT_VERIFIED") {
      const refreshed = await refreshSession();
      if (refreshed.success) {
        result = await updateWeddingProfile(body);
      }
    }

    setSaving(false);
    if (result.success) {
      setSaved(true);
      showToast("Changes saved.", "success");
      router.refresh();
    } else {
      showToast(formatApiError(result.error), "error");
    }
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Wedding date</span>
          <Input
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, weddingDate: true }))}
            invalid={touched.weddingDate && !!dateError}
            className="px-3 py-2.5"
          />
          {touched.weddingDate && <FieldError message={dateError} />}
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Partner&apos;s name</span>
          <input
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            maxLength={200}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Guest count</span>
          <input
            type="number"
            min="0"
            max="100000"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </form>
  );
}

export function AccountDetailsForm({ me }: { me: MeResponse }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState(me.profile?.firstName ?? "");
  const [lastName, setLastName] = useState(me.profile?.lastName ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [touched, setTouched] = useState<{ phone?: boolean }>({});

  // Deliberately NOT the strict 10-digit-Indian-only optionalPhoneSchema used
  // elsewhere: this field is optional and editable, and existing users may
  // already have a non-Indian or differently-formatted number saved before
  // that rule existed. Keeping the original lenient length check (rather than
  // hard-rejecting anything that isn't a valid Indian mobile number) avoids
  // blocking someone from saving the rest of their profile just because their
  // pre-existing phone number doesn't fit the newer, stricter shape.
  const phoneError = useMemo(() => {
    const trimmed = phone.trim();
    return trimmed && trimmed.length < 6 ? "Phone number must be at least 6 characters." : null;
  }, [phone]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ phone: true });
    if (phoneError) return;

    const trimmedPhone = phone.trim();
    setSaving(true);
    setSaved(false);
    const result = await updateMyProfile({
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: trimmedPhone || null,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      showToast("Changes saved.", "success");
      router.refresh();
    } else {
      showToast(formatApiError(result.error), "error");
    }
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <label className="mb-3.5 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">First name</span>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          maxLength={100}
          className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
        />
      </label>
      <label className="mb-3.5 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Last name</span>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          maxLength={100}
          className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
        />
      </label>
      <label className="mb-3.5 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Phone</span>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          invalid={touched.phone && !!phoneError}
          maxLength={20}
          placeholder="+91 98765 43210"
          className="px-3 py-2.5"
        />
        {touched.phone && <FieldError message={phoneError} />}
      </label>
      <div className="mb-4">
        <span className="mb-1.5 block font-bold text-[13px]">Email</span>
        <input value={me.email} disabled className="w-full rounded-md border border-border bg-surface-input px-3 py-2.5 text-sm text-text-grey" />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </form>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="relative inline-block h-[22px] w-10">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="absolute inset-0 cursor-pointer rounded-full bg-border transition-colors peer-checked:bg-brand-primary" />
      <span className="absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
    </label>
  );
}

// docs/bugs.md #3 — this used to call updateMyProfile() to write a JSON blob
// on UserProfile.preferences that notification.service.ts never reads (it
// reads the dedicated notification_preferences table via
// PUT /notifications/me/preferences, same endpoint the vendor settings page
// already uses). Toggling used to persist and show "saved" while silently
// having zero effect on what actually gets sent.
//
// The previous SMS and marketing-email toggles are removed rather than
// rewired: SMS isn't a modeled NotificationChannel at all (only
// IN_APP/EMAIL/TELEGRAM exist), and there's no marketing-email event type —
// both were fake switches with nothing real to attach to (user decision,
// 2026-09-03).
function isEnabled(preferences: NotificationPreference[], eventType: NotificationEventType, channel: NotificationChannel): boolean {
  const row = preferences.find((p) => p.eventType === eventType && p.channel === channel);
  // Opt-out model: no row means enabled (see notification-preferences.types.ts).
  return row ? row.isEnabled : true;
}

export function NotificationPreferencesForm({ initialPreferences }: { initialPreferences: NotificationPreference[] }) {
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);

  async function handleToggle(checked: boolean) {
    setSaving(true);
    const result = await setNotificationPreference({ eventType: "LEAD_STATUS_UPDATED", channel: "EMAIL", isEnabled: checked });
    setSaving(false);
    if (result.success) {
      setPreferences((prev) => {
        const existing = prev.find((p) => p.eventType === "LEAD_STATUS_UPDATED" && p.channel === "EMAIL");
        if (existing) return prev.map((p) => (p === existing ? result.data : p));
        return [...prev, result.data];
      });
    } else {
      showToast(formatApiError(result.error), "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between py-3.5">
        <div>
          <div className="text-sm font-semibold">Email notifications</div>
          <div className="text-xs text-text-grey">Get emailed when a vendor updates your enquiry</div>
        </div>
        <Toggle
          checked={isEnabled(preferences, "LEAD_STATUS_UPDATED", "EMAIL")}
          label="Email notifications"
          onChange={(checked) => {
            if (!saving) void handleToggle(checked);
          }}
        />
      </div>
    </div>
  );
}

export function AccountActions() {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  async function handleDeactivate() {
    setPending(true);
    const result = await deactivateAccount();
    if (result.success) {
      await logout();
      router.push("/login");
      return;
    }
    setPending(false);
    showToast(formatApiError(result.error), "error");
  }

  async function handleDelete() {
    setPending(true);
    const result = await deleteAccount();
    if (result.success) {
      router.push("/login");
      return;
    }
    setPending(false);
    showToast(formatApiError(result.error), "error");
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        className="mb-2.5 block w-full rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input"
      >
        Log out
      </button>
      <button
        type="button"
        onClick={handleDeactivate}
        disabled={pending}
        className="mb-2.5 block w-full rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
      >
        Deactivate account
      </button>

      {confirmingDelete ? (
        <div className="rounded-md border border-red-10 bg-red-10 p-3.5">
          <p className="mb-2.5 text-[13px] font-semibold text-red-70">
            This anonymizes your account and cannot be undone. Continue?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="flex-1 rounded-md bg-red py-2 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="block w-full rounded-md border border-red-10 bg-white py-3 text-center text-sm font-bold text-red hover:bg-red-10"
        >
          Delete account
        </button>
      )}
    </div>
  );
}
