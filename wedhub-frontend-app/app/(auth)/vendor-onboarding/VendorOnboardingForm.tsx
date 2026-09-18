"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { WizardGuard } from "@/components/shared/WizardGuard";
import { useWizardDraft } from "@/lib/hooks/useWizardDraft";
import { createVendor } from "@/lib/api/vendor-onboarding-client";
import { setMyCategories, upsertMyProfile } from "@/lib/api/vendor-self-client";
import { listCategoriesClient, listLocationsClient } from "@/lib/api/catalog-client";
import type { Category, Location } from "@/lib/api/vendors.types";
import { formatApiError } from "@/lib/utils/error";

const DRAFT_STORAGE_KEY = "wedhub:vendor-onboarding-draft";
const STEPS = ["Business name", "Category & city", "Pricing & description", "Review"] as const;

interface VendorOnboardingDraft {
  businessName: string;
  categoryId: string;
  cityId: string;
  startingPrice: string;
  priceRangeMin: string;
  priceRangeMax: string;
  shortDescription: string;
}

const EMPTY_DRAFT: VendorOnboardingDraft = {
  businessName: "",
  categoryId: "",
  cityId: "",
  startingPrice: "",
  priceRangeMin: "",
  priceRangeMax: "",
  shortDescription: "",
};

// Item 3, 2026-09-16 request: vendor onboarding now asks the vendor-specific
// subset up front (business name, category, city, pricing, short
// description) rather than just business name — no couple-specific
// question (event date, guest count, etc.) appears anywhere in this flow.
// Every field here already existed on VendorProfile/VendorCategory
// (upsertMyProfile/setMyCategories already worked; this is UI-only work
// surfacing them at onboarding time instead of only in the later dashboard
// editor) — createVendor -> upsertMyProfile -> setMyCategories run in
// sequence, same three real endpoints the dashboard's profile editor uses.
export function VendorOnboardingForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { state, setState, saveDraft, clearDraft, markSubmitted } = useWizardDraft<VendorOnboardingDraft>(
    DRAFT_STORAGE_KEY,
    EMPTY_DRAFT,
  );

  useEffect(() => {
    void listCategoriesClient().then((result) => {
      if (result.success) setCategories(result.data);
    });
    void listLocationsClient("CITY").then((result) => {
      if (result.success) setCities(result.data);
    });
  }, []);

  const hasUnsavedChanges = state.businessName.trim().length > 0 || state.categoryId.length > 0;

  function updateField<K extends keyof VendorOnboardingDraft>(key: K, value: VendorOnboardingDraft[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(currentStep: number): boolean {
    const errors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!state.businessName.trim()) errors.businessName = "Please enter your business or brand name.";
    }

    if (currentStep === 1) {
      if (!state.categoryId) errors.categoryId = "Please select your primary category.";
      if (!state.cityId) errors.cityId = "Please select your city.";
    }

    if (currentStep === 2) {
      const min = state.priceRangeMin ? Number(state.priceRangeMin) : undefined;
      const max = state.priceRangeMax ? Number(state.priceRangeMax) : undefined;
      if (min !== undefined && max !== undefined && min > max) {
        errors.priceRangeMax = "Maximum must be greater than or equal to minimum.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setFieldErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      showToast("Please fix the errors in earlier steps before submitting.", "error");
      return;
    }
    setSubmitting(true);

    const createResult = await createVendor(state.businessName.trim());
    if (!createResult.success) {
      setSubmitting(false);
      // A returning vendor whose account already has a listing (e.g. via
      // Google re-auth) — same handling as SignupWizard.tsx's own
      // createVendor call site.
      if (createResult.error?.code === "CONFLICT") {
        router.push("/vendor/dashboard");
        return;
      }
      showToast(formatApiError(createResult.error), "error");
      return;
    }

    const profileResult = await upsertMyProfile({
      shortDescription: state.shortDescription || undefined,
      cityId: state.cityId || undefined,
      startingPrice: state.startingPrice ? Number(state.startingPrice) : undefined,
      priceRangeMin: state.priceRangeMin ? Number(state.priceRangeMin) : undefined,
      priceRangeMax: state.priceRangeMax ? Number(state.priceRangeMax) : undefined,
    });
    if (!profileResult.success) {
      setSubmitting(false);
      showToast(formatApiError(profileResult.error), "error");
      return;
    }

    const categoriesResult = await setMyCategories({ primaryCategoryId: state.categoryId, subcategoryIds: [] });
    setSubmitting(false);
    if (!categoriesResult.success) {
      showToast(formatApiError(categoriesResult.error), "error");
      return;
    }

    markSubmitted();
    clearDraft();
    router.push("/vendor/dashboard");
  }

  return (
    <WizardGuard hasUnsavedChanges={hasUnsavedChanges} onSaveDraft={saveDraft}>
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-bold text-text-grey">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
          <button type="button" onClick={saveDraft} className="text-[13px] font-bold text-brand-primary hover:underline">
            Save as draft
          </button>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label htmlFor="businessName" className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">
              Business / Brand Name *
            </label>
            <Input
              id="businessName"
              type="text"
              placeholder="e.g. Royal Blooms Photography"
              value={state.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              autoFocus
              disabled={submitting}
              invalid={!!fieldErrors.businessName}
            />
            <FieldError message={fieldErrors.businessName} />
            <p className="mt-1.5 text-xs text-text-grey">
              This is the name couples will see on your public storefront and portfolio. You can edit this anytime.
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">
              Primary category *
            </label>
            <select
              value={state.categoryId}
              onChange={(e) => updateField("categoryId", e.target.value)}
              className={`w-full rounded-md border px-4 py-3 text-sm ${fieldErrors.categoryId ? "border-red focus:border-red" : "border-border focus:border-brand-primary"}`}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.categoryId} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">City *</label>
            <select
              value={state.cityId}
              onChange={(e) => updateField("cityId", e.target.value)}
              className={`w-full rounded-md border px-4 py-3 text-sm ${fieldErrors.cityId ? "border-red focus:border-red" : "border-border focus:border-brand-primary"}`}
            >
              <option value="">Select your city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.cityId} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">
              Starting price (₹, optional)
            </label>
            <Input type="number" min="0" value={state.startingPrice} onChange={(e) => updateField("startingPrice", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 max-[400px]:grid-cols-1">
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">
                Price range min (₹, optional)
              </label>
              <Input type="number" min="0" value={state.priceRangeMin} onChange={(e) => updateField("priceRangeMin", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">
                Price range max (₹, optional)
              </label>
              <Input
                type="number"
                min="0"
                value={state.priceRangeMax}
                onChange={(e) => updateField("priceRangeMax", e.target.value)}
                invalid={!!fieldErrors.priceRangeMax}
              />
              <FieldError message={fieldErrors.priceRangeMax} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold tracking-wide uppercase text-text-grey">
              Short description (optional)
            </label>
            <textarea
              value={state.shortDescription}
              onChange={(e) => updateField("shortDescription", e.target.value)}
              maxLength={150}
              rows={3}
              placeholder="A one-line tagline couples will see on your listing"
              className="w-full rounded-md border border-border px-4 py-3 text-sm"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-bold">Business name:</span> {state.businessName}
          </p>
          <p>
            <span className="font-bold">Category:</span>{" "}
            {categories.find((c) => c.id === state.categoryId)?.name ?? "—"}
          </p>
          <p>
            <span className="font-bold">City:</span> {cities.find((c) => c.id === state.cityId)?.name ?? "—"}
          </p>
          {state.startingPrice && (
            <p>
              <span className="font-bold">Starting price:</span> ₹{state.startingPrice}
            </p>
          )}
          {(state.priceRangeMin || state.priceRangeMax) && (
            <p>
              <span className="font-bold">Price range:</span> ₹{state.priceRangeMin || "0"} – ₹
              {state.priceRangeMax || "any"}
            </p>
          )}
          {state.shortDescription && (
            <p>
              <span className="font-bold">Description:</span> {state.shortDescription}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button type="button" variant="secondary" onClick={goBack} disabled={submitting}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" variant="primary" block onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Button type="button" variant="primary" block onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating your listing…" : "Complete Setup & Enter Dashboard →"}
          </Button>
        )}
      </div>
    </WizardGuard>
  );
}
