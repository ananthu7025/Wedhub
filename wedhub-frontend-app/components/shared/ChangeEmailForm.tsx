"use client";

import { useMemo, useState } from "react";
import { changeEmail } from "@/lib/api/auth-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { emailSchema, validateField } from "@/lib/validation/auth-schemas";

// Shared between (couple)/account and (vendor)/vendor/settings — both roles
// need edit-email (item 9), and the flow is identical either way. Deliberately
// its own form, separate from name/business-detail forms: changing email
// needs the current password and starts a pending confirmation flow (see
// wedhub-backend's auth.service.ts::changeEmail — the account's real email
// doesn't move until the link mailed to the new address is clicked).
export function ChangeEmailForm() {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [touched, setTouched] = useState<{ newEmail?: boolean; currentPassword?: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const emailError = useMemo(() => validateField(emailSchema, newEmail), [newEmail]);
  const passwordError = currentPassword.trim().length === 0 ? "Current password is required" : null;
  const isFormValid = !emailError && !passwordError;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ newEmail: true, currentPassword: true });
    if (!isFormValid) return;

    setSaving(true);
    const result = await changeEmail(newEmail.trim(), currentPassword);
    setSaving(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    setPendingMessage(
      `Check ${newEmail.trim()} for a link to confirm this change. Your current email stays active until then.`,
    );
    setEditing(false);
    setNewEmail("");
    setCurrentPassword("");
    setTouched({});
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
    <form onSubmit={handleSubmit} className="rounded-md border border-border bg-surface-input p-3.5" noValidate>
      <label className="mb-3 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">New email</span>
        <Input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, newEmail: true }))}
          invalid={touched.newEmail && !!emailError}
          className="bg-white"
        />
        {touched.newEmail && <FieldError message={emailError} />}
      </label>
      <label className="mb-3 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Current password</span>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, currentPassword: true }))}
          invalid={touched.currentPassword && !!passwordError}
          className="bg-white"
        />
        {touched.currentPassword && <FieldError message={passwordError} />}
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
            setTouched({});
          }}
          className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-bold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
