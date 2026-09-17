"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { setMyAttributes } from "@/lib/api/vendor-self-client";
import type { CategorySelf, VendorSelf } from "@/lib/api/vendor-self.types";
import { formatApiError } from "@/lib/utils/error";
import { AttributesSection, type AttributeValue, type AttributeValueMap } from "./AttributesSection";

/**
 * Item 12: this page used to be a 7-tab editor covering everything from
 * business name to category-specific questions. It's now
 * category-attributes-only — every general field (basic info, category,
 * location, pricing, contact/social, more-details) moved to
 * ../settings/SettingsBoard.tsx, which is also where "Submit for review"
 * now lives, since 4 of the 5 submission-blocking requirements
 * (description, category, city, contact method) live there.
 *
 * The category shown here is the vendor's *saved* primary category (from
 * vendor.categories), not a live-editable dropdown — the old editor let the
 * attributes tab react to an unsaved category selection, which meant the
 * form could show questions for a category that was never actually
 * persisted. Changing category now only happens in Settings; this page
 * just reflects whatever that section last saved.
 */
export function ProfileEditor({ vendor, categories }: { vendor: VendorSelf; categories: CategorySelf[] }) {
  const router = useRouter();
  const primaryCategoryEntry = vendor.categories.find((c) => c.isPrimary) ?? null;
  const selectedCategory = categories.find((c) => c.id === primaryCategoryEntry?.categoryId) ?? null;

  const [attributeValues, setAttributeValues] = useState<AttributeValueMap>(() => {
    const initial: AttributeValueMap = {};
    for (const av of vendor.attributeValues) {
      if (av.valueText !== null) initial[av.attributeId] = av.valueText;
      else if (av.valueNumber !== null) initial[av.attributeId] = Number(av.valueNumber);
      else if (av.valueBoolean !== null) initial[av.attributeId] = av.valueBoolean;
      else if (av.valueOptions.length > 0) initial[av.attributeId] = av.valueOptions;
      else if (av.valueJson !== null) initial[av.attributeId] = av.valueJson;
    }
    return initial;
  });

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  function isAttributeValueEmpty(value: AttributeValue | undefined): boolean {
    if (value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") {
      if ("min" in value) return !Number.isFinite(value.min) || !Number.isFinite(value.max);
      if ("time" in value) return value.time.trim().length === 0;
      if ("start" in value) return value.start.trim().length === 0 || value.end.trim().length === 0;
    }
    return false; // numbers and booleans (including false/0) count as filled in
  }

  async function handleSave() {
    // Mirrors the backend's setAttributeValues check (vendor.service.ts) so
    // a missing required category field surfaces immediately, not after a
    // round trip — admins mark fields required per category in
    // CategoryAttributesPanel.
    const missingRequiredAttributes = (selectedCategory?.attributes ?? []).filter(
      (attribute) => attribute.isRequired && isAttributeValueEmpty(attributeValues[attribute.id]),
    );
    if (missingRequiredAttributes.length > 0) {
      setStatus("error");
      setError(`Missing required field(s): ${missingRequiredAttributes.map((a) => a.label).join(", ")}`);
      return;
    }

    setStatus("saving");
    setError("");

    const result = await setMyAttributes({
      values: Object.entries(attributeValues).map(([attributeId, value]) => ({ attributeId, value })),
    });
    if (!result.success) {
      setStatus("error");
      setError(formatApiError(result.error));
      return;
    }

    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{selectedCategory ? `${selectedCategory.name} details` : "Category details"}</h1>
        <p className="text-xs sm:text-sm text-text-grey">
          Questions specific to your category — shown to couples on your public vendor page.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        {!primaryCategoryEntry ? (
          <p className="text-sm text-text-grey">
            Choose a category in{" "}
            <Link href="/vendor/settings" className="font-bold text-brand-primary no-underline">
              Settings
            </Link>{" "}
            first to see the questions for it.
          </p>
        ) : selectedCategory && selectedCategory.attributes.length > 0 ? (
          <AttributesSection
            attributes={selectedCategory.attributes}
            values={attributeValues}
            onChange={setAttributeValues}
            mediaByAttributeId={vendor.mediaByAttributeId}
          />
        ) : (
          <p className="text-sm text-text-grey">This category has no additional profile fields configured.</p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-white p-5">
        {status === "error" && <div className="mb-3.5 rounded-md bg-red-10 p-3.5 text-[13px] text-red-70">{error}</div>}
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving" || !primaryCategoryEntry}
          className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
