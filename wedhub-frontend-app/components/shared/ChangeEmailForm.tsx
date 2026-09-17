"use client";

import { useState } from "react";
import { changeEmail } from "@/lib/api/auth-client";
import { formatApiError } from "@/lib/utils/error";

// Shared between (couple)/account and (vendor)/vendor/settings — both roles
// need edit-email (item 9), and the flow is identical either way. Deliberately
// its own form, separate from name/business-detail forms: changing email
// needs the current password and starts a pending confirmation flow (see
// wedhub-backend's auth.service.ts::changeEmail — the account's real email
// doesn't move until the link mailed to the new address is clicked).
export function ChangeEmailForm() {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const result = await changeEmail(newEmail.trim(), currentPassword);
    setSaving(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPendingMessage(
      `Check ${newEmail.trim()} for a link to confirm this change. Your current email stays active until then.`,
    );
    setEditing(false);
    setNewEmail("");
    setCurrentPassword("");
  }

  if (pendingMessage) {
    return <p className="rounded-md bg-emerald-10 p-2.5 text-[13px] text-emerald-70">{pendingMessage}</p>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[13px] font-bold text-brand-primary hover:underline"
      >
        Change email
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-border bg-surface-input p-3.5">
      {error && <p className="mb-3 rounded-md bg-red-10 p-2 text-[13px] text-red-70">{error}</p>}
      <label className="mb-3 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">New email</span>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm"
        />
      </label>
      <label className="mb-3 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Current password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-md bg-brand-primary py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Sending link…" : "Send confirmation link"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-bold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
