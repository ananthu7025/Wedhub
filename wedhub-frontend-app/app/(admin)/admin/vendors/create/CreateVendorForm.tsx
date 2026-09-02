"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminVendor, createAdminVendorInvitation } from "@/lib/api/admin-client";

/**
 * Admin-initiated vendor creation (Frontend Arch Phase 8, Route B per
 * product.md), matching only what wedhub-frontend/admin/vendor-create.html's
 * form maps to real backend calls: POST /admin/vendors accepts businessName
 * only, POST /admin/vendors/:id/invitations accepts invitedEmail only.
 * The mockup's category/city/phone/internal-note fields are dropped
 * entirely (per user decision, 2026-09-02) rather than collected with
 * nowhere to persist to — the invited vendor fills those in themselves via
 * self-service onboarding once they claim the invitation, same as any
 * self-registered vendor already does (Frontend Arch Phase 5).
 */
export function CreateVendorForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ vendorId: string; invitationSent: boolean } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!businessName.trim()) return;
    setSaving(true);
    setError(null);

    const createResult = await createAdminVendor({ businessName: businessName.trim() });
    if (!createResult.success) {
      setSaving(false);
      setError(createResult.error.message);
      return;
    }

    let invitationSent = false;
    if (invitedEmail.trim()) {
      const inviteResult = await createAdminVendorInvitation(createResult.data.id, { invitedEmail: invitedEmail.trim() });
      invitationSent = inviteResult.success;
    }

    setSaving(false);
    setCreated({ vendorId: createResult.data.id, invitationSent });
  }

  if (created) {
    return (
      <div className="mx-auto max-w-[560px] rounded-xl border border-border bg-white p-8 text-center">
        <h1 className="mb-2 text-xl font-bold">Vendor draft created</h1>
        <p className="mb-6 text-sm text-text-grey">
          {created.invitationSent
            ? "An invitation was queued to the email you provided. The vendor can claim the listing and complete their profile via self-service onboarding."
            : "No invitation email was provided — you can add one from the vendor's detail page."}
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => router.push(`/admin/vendors/${created.vendorId}`)}
            className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            View vendor
          </button>
          <button
            onClick={() => router.push("/admin/vendors")}
            className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark"
          >
            Back to vendors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create vendor</h1>
        <p className="text-sm text-text-grey">Manually onboard a vendor (admin-initiated).</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-text-grey">
        <span>1. Admin creates listing</span>
        <span>→</span>
        <span>2. Vendor invited</span>
        <span>→</span>
        <span>3. Vendor claims &amp; verifies</span>
        <span>→</span>
        <span>4. Admin reviews &amp; approves</span>
        <span>→</span>
        <span>5. Vendor goes public</span>
      </div>

      <div className="mb-5 rounded-md bg-brand-primary-soft p-4 text-[13px] text-brand-ink">
        This creates a minimal draft profile owned by the platform. If you provide an email, the vendor will receive
        an invitation to claim this listing and complete the remaining profile fields (category, location, portfolio,
        pricing, packages) themselves before it can be approved for public search.
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-6">
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Business name</span>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Example Studios"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Contact email (invitation sent here, optional)</span>
          <input
            type="email"
            value={invitedEmail}
            onChange={(e) => setInvitedEmail(e.target.value)}
            placeholder="vendor@example.com"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !businessName.trim()}
            className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create & send invitation"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/vendors")}
            className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
