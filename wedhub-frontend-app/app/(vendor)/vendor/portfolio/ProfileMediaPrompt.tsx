"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertMyProfile } from "@/lib/api/vendor-self-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { LogoCoverPicker } from "../profile/LogoCoverPicker";

/**
 * Item 4 (2026-09-22 request): "no one is uploading the profile image and
 * cover image, because there is no explicit push to add those." Previously
 * the only way to set a logo/cover was to upload a photo into the general
 * portfolio gallery below, then hover/tap it to reveal a small "set as
 * logo/cover" icon buried in that photo's action overlay — nothing on this
 * page ever told a vendor that step existed. This renders both pickers
 * directly at the top of Portfolio, uploading and saving immediately on
 * selection (LogoCoverPicker's onChange), the same direct one-step flow
 * already used for category-attribute images — no separate "Save changes"
 * click needed.
 */
export function ProfileMediaPrompt({
  logoMediaId,
  logoObjectKey,
  coverMediaId,
  coverObjectKey,
}: {
  logoMediaId: string | null;
  logoObjectKey: string | null;
  coverMediaId: string | null;
  coverObjectKey: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState<"logo" | "cover" | null>(null);

  async function handleLogoChange(mediaId: string | null) {
    setSaving("logo");
    const result = await upsertMyProfile({ logoMediaId: mediaId });
    setSaving(null);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    showToast("Profile photo updated.", "success");
    router.refresh();
  }

  async function handleCoverChange(mediaId: string | null) {
    setSaving("cover");
    const result = await upsertMyProfile({ coverMediaId: mediaId });
    setSaving(null);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    showToast("Cover photo updated.", "success");
    router.refresh();
  }

  const missingBoth = !logoMediaId && !coverMediaId;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-bold text-text-dark">Profile &amp; cover photo</h2>
        <p className="text-xs text-text-grey">
          {missingBoth
            ? "Add these so couples recognize your business at a glance — they're the first thing shown on your public profile and in search results."
            : "Shown at the top of your public profile and in search results."}
        </p>
      </div>
      <div className="flex flex-wrap gap-6">
        <LogoCoverPicker
          label="Profile photo"
          mediaId={logoMediaId}
          initialObjectKey={logoObjectKey}
          onChange={handleLogoChange}
          mediaType="LOGO"
          shape="square"
        />
        <LogoCoverPicker
          label="Cover photo"
          mediaId={coverMediaId}
          initialObjectKey={coverObjectKey}
          onChange={handleCoverChange}
          mediaType="COVER"
          shape="wide"
        />
      </div>
      {saving && <p className="mt-3 text-xs text-text-grey">Saving…</p>}
    </div>
  );
}
