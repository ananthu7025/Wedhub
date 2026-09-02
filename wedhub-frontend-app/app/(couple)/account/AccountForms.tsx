"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deactivateAccount, deleteAccount, updateWeddingProfile } from "@/lib/api/account-client";
import { updateMyProfile } from "@/lib/api/users-client";
import { logout } from "@/lib/api/auth-client";
import type { MeResponse } from "@/lib/api/account.types";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function WeddingDetailsForm({ me }: { me: MeResponse }) {
  const router = useRouter();
  const [weddingDate, setWeddingDate] = useState(toDateInputValue(me.weddingProfile?.weddingDate ?? null));
  const [partnerName, setPartnerName] = useState(me.weddingProfile?.partnerName ?? "");
  const [guestCount, setGuestCount] = useState(me.weddingProfile?.guestCount?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    const result = await updateWeddingProfile({
      weddingDate: weddingDate ? new Date(weddingDate).toISOString() : undefined,
      partnerName: partnerName || undefined,
      guestCount: guestCount ? Number(guestCount) : undefined,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSave}>
      <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Wedding date</span>
          <input
            type="date"
            value={weddingDate}
            onChange={(e) => setWeddingDate(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Partner&apos;s name</span>
          <input
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Guest count</span>
          <input
            type="number"
            min="0"
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
  const [firstName, setFirstName] = useState(me.profile?.firstName ?? "");
  const [lastName, setLastName] = useState(me.profile?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    const result = await updateMyProfile({ firstName: firstName || undefined, lastName: lastName || undefined });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSave}>
      <label className="mb-3.5 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">First name</span>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
      </label>
      <label className="mb-3.5 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Last name</span>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
      </label>
      <label className="mb-3.5 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Phone</span>
        <input value={me.phone ?? "Not set"} disabled className="w-full rounded-md border border-border bg-surface-input px-3 py-2.5 text-sm text-text-grey" />
      </label>
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Email</span>
        <input value={me.email} disabled className="w-full rounded-md border border-border bg-surface-input px-3 py-2.5 text-sm text-text-grey" />
      </label>
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

export function NotificationPreferencesForm({ me }: { me: MeResponse }) {
  const router = useRouter();
  const defaults = me.profile?.preferences?.notifications ?? {
    emailMarketing: true,
    emailTransactional: true,
    smsEnabled: false,
  };
  const [emailTransactional, setEmailTransactional] = useState(defaults.emailTransactional);
  const [smsEnabled, setSmsEnabled] = useState(defaults.smsEnabled);
  const [emailMarketing, setEmailMarketing] = useState(defaults.emailMarketing);

  async function persist(next: { emailTransactional: boolean; smsEnabled: boolean; emailMarketing: boolean }) {
    await updateMyProfile({
      preferences: {
        notifications: next,
        preferredCategories: me.profile?.preferences?.preferredCategories ?? [],
      },
    });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-neutral-grey-20 py-3.5">
        <div>
          <div className="text-sm font-semibold">Email notifications</div>
          <div className="text-xs text-text-grey">Vendor responses, recommendations</div>
        </div>
        <Toggle
          checked={emailTransactional}
          label="Email notifications"
          onChange={(checked) => {
            setEmailTransactional(checked);
            void persist({ emailTransactional: checked, smsEnabled, emailMarketing });
          }}
        />
      </div>
      <div className="flex items-center justify-between border-b border-neutral-grey-20 py-3.5">
        <div>
          <div className="text-sm font-semibold">SMS notifications</div>
          <div className="text-xs text-text-grey">Get updates via SMS</div>
        </div>
        <Toggle
          checked={smsEnabled}
          label="SMS notifications"
          onChange={(checked) => {
            setSmsEnabled(checked);
            void persist({ emailTransactional, smsEnabled: checked, emailMarketing });
          }}
        />
      </div>
      <div className="flex items-center justify-between py-3.5">
        <div>
          <div className="text-sm font-semibold">Marketing emails</div>
          <div className="text-xs text-text-grey">Tips, offers and featured vendors</div>
        </div>
        <Toggle
          checked={emailMarketing}
          label="Marketing emails"
          onChange={(checked) => {
            setEmailMarketing(checked);
            void persist({ emailTransactional, smsEnabled, emailMarketing: checked });
          }}
        />
      </div>
    </div>
  );
}

export function AccountActions() {
  const router = useRouter();
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
    }
    setPending(false);
  }

  async function handleDelete() {
    setPending(true);
    const result = await deleteAccount();
    if (result.success) {
      router.push("/login");
    }
    setPending(false);
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
