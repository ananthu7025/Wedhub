"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WizardGuard } from "@/components/shared/WizardGuard";
import { useWizardDraft } from "@/lib/hooks/useWizardDraft";
import { listCategoriesClient, listLocationsClient } from "@/lib/api/catalog-client";
import { submitProfileSetup } from "@/lib/api/profile-setup-client";
import { updateMyProfile } from "@/lib/api/users-client";
import type { Category, Location } from "@/lib/api/vendors.types";
import {
  EMPTY_PROFILE_SETUP_DRAFT,
  FUNCTION_TYPE_LABELS,
  type FunctionType,
  type ProfileSetupDraft,
} from "@/lib/api/profile-setup.types";
import { formatApiError } from "@/lib/utils/error";

const DRAFT_STORAGE_KEY = "wedhub:profile-setup-draft";
const FUNCTION_TYPES = Object.keys(FUNCTION_TYPE_LABELS) as FunctionType[];
const STEPS = ["Event dates", "Guest count", "Categories", "Budget", "Review"] as const;

const TODAY = new Date().toISOString().slice(0, 10);

function newEventDate(): ProfileSetupDraft["eventDates"][number] {
  return { functionType: "WEDDING", otherLabel: "", date: "", time: "", guestCount: "" };
}

export function ProfileSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { state, setState, saveDraft, clearDraft, markSubmitted } = useWizardDraft<ProfileSetupDraft>(
    DRAFT_STORAGE_KEY,
    EMPTY_PROFILE_SETUP_DRAFT,
  );

  useEffect(() => {
    void listCategoriesClient().then((result) => {
      if (result.success) setCategories(result.data);
    });
    void listLocationsClient("CITY").then((result) => {
      if (result.success) setCities(result.data);
    });
    // Item 7: prefill phone if the customer already has one on file (set at
    // signup, or edited on the account page) — same client-side prefill
    // pattern EnquiryModal.tsx already uses for this same endpoint. Only
    // fills in when the draft doesn't already have a value, so it never
    // clobbers something the customer just typed on this visit.
    fetch("/api/users/me", { credentials: "include" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: { phone: string | null } }) => {
        if (!json.success || !json.data?.phone) return;
        setState((prev) => (prev.phone ? prev : { ...prev, phone: json.data!.phone! }));
      })
      .catch(() => {
        // Prefill is a convenience, not a requirement — leave blank on failure.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A wizard with zero event dates, zero categories, and no city selected
  // yet has nothing worth prompting to save — WizardGuard should stay quiet
  // until there's real progress.
  const hasUnsavedChanges =
    state.eventDates.length > 0 || state.categoryPreferences.length > 0 || state.cityId.length > 0 || state.phone.length > 0;

  function updateField<K extends keyof ProfileSetupDraft>(key: K, value: ProfileSetupDraft[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function addEventDate() {
    setState((prev) => ({ ...prev, eventDates: [...prev.eventDates, newEventDate()] }));
  }

  function updateEventDate(index: number, patch: Partial<ProfileSetupDraft["eventDates"][number]>) {
    setState((prev) => ({
      ...prev,
      eventDates: prev.eventDates.map((ed, i) => (i === index ? { ...ed, ...patch } : ed)),
    }));
  }

  function removeEventDate(index: number) {
    setState((prev) => ({ ...prev, eventDates: prev.eventDates.filter((_, i) => i !== index) }));
  }

  function toggleCategory(categoryId: string) {
    setState((prev) => {
      const exists = prev.categoryPreferences.some((cp) => cp.categoryId === categoryId);
      if (exists) {
        return { ...prev, categoryPreferences: prev.categoryPreferences.filter((cp) => cp.categoryId !== categoryId) };
      }
      return {
        ...prev,
        categoryPreferences: [...prev.categoryPreferences, { categoryId, budgetMin: "", budgetMax: "" }],
      };
    });
  }

  function updateCategoryBudget(categoryId: string, patch: Partial<{ budgetMin: string; budgetMax: string }>) {
    setState((prev) => ({
      ...prev,
      categoryPreferences: prev.categoryPreferences.map((cp) => (cp.categoryId === categoryId ? { ...cp, ...patch } : cp)),
    }));
  }

  function validateStep(currentStep: number): boolean {
    const errors: Record<string, string> = {};

    if (currentStep === 0) {
      if (state.eventDates.length === 0) {
        errors.eventDates = "Add at least one event date";
      }
      state.eventDates.forEach((ed, i) => {
        if (!ed.date) errors[`eventDate.${i}.date`] = "Date is required";
        else if (ed.date < TODAY) errors[`eventDate.${i}.date`] = "Date cannot be in the past";
        if (ed.functionType === "OTHER" && !ed.otherLabel.trim()) {
          errors[`eventDate.${i}.otherLabel`] = "Please name this function";
        }
      });
    }

    if (currentStep === 1) {
      if (!state.cityId) {
        errors.cityId = "Please select your wedding city";
      }
      if (state.guestCount && (Number(state.guestCount) < 0 || Number(state.guestCount) > 100000)) {
        errors.guestCount = "Enter a realistic guest count";
      }
      if (state.phone.trim() && state.phone.trim().length < 6) {
        errors.phone = "Phone number must be at least 6 characters";
      }
    }

    if (currentStep === 2) {
      if (state.categoryPreferences.length === 0) {
        errors.categoryPreferences = "Select at least one category to explore";
      }
    }

    if (currentStep === 3) {
      state.categoryPreferences.forEach((cp) => {
        const min = cp.budgetMin ? Number(cp.budgetMin) : undefined;
        const max = cp.budgetMax ? Number(cp.budgetMax) : undefined;
        if (min !== undefined && max !== undefined && min > max) {
          errors[`budget.${cp.categoryId}`] = "Minimum must be less than or equal to maximum";
        }
      });
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
    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setSubmitError("Please fix the errors in earlier steps before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    // Phone lives on User, not WeddingProfile, so it's a separate call —
    // only fired when the customer actually typed something, so leaving it
    // blank never clears an already-saved phone number.
    const trimmedPhone = state.phone.trim();
    if (trimmedPhone) {
      const phoneResult = await updateMyProfile({ phone: trimmedPhone });
      if (!phoneResult.success) {
        setSubmitting(false);
        setSubmitError(formatApiError(phoneResult.error));
        return;
      }
    }

    const result = await submitProfileSetup({
      cityId: state.cityId,
      guestCount: state.guestCount ? Number(state.guestCount) : undefined,
      weddingStyle: state.weddingStyle || undefined,
      partnerName: state.partnerName || undefined,
      notes: state.notes || undefined,
      eventDates: state.eventDates.map((ed) => ({
        functionType: ed.functionType,
        otherLabel: ed.otherLabel || undefined,
        date: ed.date,
        time: ed.time || undefined,
        guestCount: ed.guestCount ? Number(ed.guestCount) : undefined,
      })),
      categoryPreferences: state.categoryPreferences.map((cp) => ({
        categoryId: cp.categoryId,
        budgetMin: cp.budgetMin ? Number(cp.budgetMin) : undefined,
        budgetMax: cp.budgetMax ? Number(cp.budgetMax) : undefined,
      })),
    });

    setSubmitting(false);
    if (!result.success) {
      setSubmitError(formatApiError(result.error));
      return;
    }

    markSubmitted();
    clearDraft();
    router.push("/shortlist");
  }

  return (
    <WizardGuard hasUnsavedChanges={hasUnsavedChanges} onSaveDraft={saveDraft}>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold">Set up your wedding profile</h1>
          <button type="button" onClick={saveDraft} className="text-[13px] font-bold text-brand-primary hover:underline">
            Save as draft
          </button>
        </div>
        <p className="mb-4 text-[13px] text-text-grey">
          Tell us about your wedding so we can match you with the right vendors.
        </p>
        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-text-grey">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        {step === 0 && (
          <div>
            <h2 className="mb-1 text-base font-bold">Event date(s) and function type(s)</h2>
            <p className="mb-4 text-[13px] text-text-grey">
              Add every function you&apos;re planning — mehendi, sangeet, wedding, reception — each with its own
              date.
            </p>
            {fieldErrors.eventDates && <p className="mb-3 text-[13px] text-red-70">{fieldErrors.eventDates}</p>}
            <div className="space-y-4">
              {state.eventDates.map((ed, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[13px] font-bold">Function {i + 1}</span>
                    <button type="button" onClick={() => removeEventDate(i)} className="text-[12px] font-semibold text-red-70 hover:underline">
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-[500px]:grid-cols-1">
                    <label className="block text-sm">
                      <span className="mb-1 block text-[12px] font-bold">Function type</span>
                      <select
                        value={ed.functionType}
                        onChange={(e) => updateEventDate(i, { functionType: e.target.value as FunctionType })}
                        className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
                      >
                        {FUNCTION_TYPES.map((ft) => (
                          <option key={ft} value={ft}>
                            {FUNCTION_TYPE_LABELS[ft]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[12px] font-bold">Date</span>
                      <Input type="date" min={TODAY} value={ed.date} onChange={(e) => updateEventDate(i, { date: e.target.value })} />
                      {fieldErrors[`eventDate.${i}.date`] && (
                        <p className="mt-1 text-[12px] text-red-70">{fieldErrors[`eventDate.${i}.date`]}</p>
                      )}
                    </label>
                    {ed.functionType === "OTHER" && (
                      <label className="col-span-2 block text-sm">
                        <span className="mb-1 block text-[12px] font-bold">What is this function called?</span>
                        <Input value={ed.otherLabel} onChange={(e) => updateEventDate(i, { otherLabel: e.target.value })} maxLength={100} />
                        {fieldErrors[`eventDate.${i}.otherLabel`] && (
                          <p className="mt-1 text-[12px] text-red-70">{fieldErrors[`eventDate.${i}.otherLabel`]}</p>
                        )}
                      </label>
                    )}
                    <label className="block text-sm">
                      <span className="mb-1 block text-[12px] font-bold">Time (optional)</span>
                      <Input placeholder="e.g. 10:00 AM" value={ed.time} onChange={(e) => updateEventDate(i, { time: e.target.value })} maxLength={20} />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[12px] font-bold">Guests for this function (optional)</span>
                      <Input type="number" min="0" max="100000" value={ed.guestCount} onChange={(e) => updateEventDate(i, { guestCount: e.target.value })} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addEventDate}
              className="mt-4 w-full rounded-md border border-dashed border-border py-2.5 text-[13px] font-bold text-brand-primary hover:bg-brand-primary-soft"
            >
              + Add a function
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="mb-1 text-base font-bold">Expected number of visitors</h2>
            <p className="mb-4 text-[13px] text-text-grey">A rough overall guest count helps vendors quote accurately.</p>
            <label className="mb-4 block text-sm">
              <span className="mb-1.5 block text-[13px] font-bold">Wedding city *</span>
              <select
                value={state.cityId}
                onChange={(e) => updateField("cityId", e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              >
                <option value="">Select your wedding city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {fieldErrors.cityId && <p className="mt-1 text-[12px] text-red-70">{fieldErrors.cityId}</p>}
              <p className="mt-1.5 text-xs text-text-grey">
                Helps us match you with vendors who actually serve your wedding location.
              </p>
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1.5 block text-[13px] font-bold">Total expected guests</span>
              <Input type="number" min="0" max="100000" value={state.guestCount} onChange={(e) => updateField("guestCount", e.target.value)} />
              {fieldErrors.guestCount && <p className="mt-1 text-[12px] text-red-70">{fieldErrors.guestCount}</p>}
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1.5 block text-[13px] font-bold">Phone number</span>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={state.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                maxLength={20}
              />
              {fieldErrors.phone && <p className="mt-1 text-[12px] text-red-70">{fieldErrors.phone}</p>}
              <p className="mt-1.5 text-xs text-text-grey">So vendors can reach you directly if you prefer a call.</p>
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1.5 block text-[13px] font-bold">Wedding style (optional)</span>
              <Input placeholder="e.g. Traditional Kerala, Destination, Modern" value={state.weddingStyle} onChange={(e) => updateField("weddingStyle", e.target.value)} maxLength={100} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[13px] font-bold">Anything else vendors should know? (optional)</span>
              <textarea
                value={state.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-1 text-base font-bold">Vendors you&apos;d like to explore</h2>
            <p className="mb-4 text-[13px] text-text-grey">Select every category you want to find vendors for.</p>
            {fieldErrors.categoryPreferences && <p className="mb-3 text-[13px] text-red-70">{fieldErrors.categoryPreferences}</p>}
            <div className="grid grid-cols-2 gap-2 max-[500px]:grid-cols-1">
              {categories.map((category) => {
                const selected = state.categoryPreferences.some((cp) => cp.categoryId === category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`rounded-md border px-3.5 py-2.5 text-left text-[13px] font-semibold ${
                      selected ? "border-brand-primary bg-brand-primary-soft text-brand-primary" : "border-border text-text-dark hover:bg-surface-input"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-1 text-base font-bold">Price range for each category</h2>
            <p className="mb-4 text-[13px] text-text-grey">Optional — helps us match vendors within your budget.</p>
            <div className="space-y-4">
              {state.categoryPreferences.map((cp) => {
                const category = categories.find((c) => c.id === cp.categoryId);
                return (
                  <div key={cp.categoryId} className="rounded-lg border border-border p-4">
                    <p className="mb-2.5 text-[13px] font-bold">{category?.name ?? "Category"}</p>
                    <div className="grid grid-cols-2 gap-3 max-[400px]:grid-cols-1">
                      <label className="block text-sm">
                        <span className="mb-1 block text-[12px] font-bold">Min budget (₹)</span>
                        <Input type="number" min="0" value={cp.budgetMin} onChange={(e) => updateCategoryBudget(cp.categoryId, { budgetMin: e.target.value })} />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-[12px] font-bold">Max budget (₹)</span>
                        <Input type="number" min="0" value={cp.budgetMax} onChange={(e) => updateCategoryBudget(cp.categoryId, { budgetMax: e.target.value })} />
                      </label>
                    </div>
                    {fieldErrors[`budget.${cp.categoryId}`] && (
                      <p className="mt-2 text-[12px] text-red-70">{fieldErrors[`budget.${cp.categoryId}`]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="mb-1 text-base font-bold">Review &amp; submit</h2>
            <p className="mb-4 text-[13px] text-text-grey">Confirm everything looks right before submitting.</p>
            <div className="mb-4 space-y-2 text-[13px]">
              <p className="font-bold">Functions</p>
              {state.eventDates.map((ed, i) => (
                <p key={i} className="text-text-grey">
                  {ed.functionType === "OTHER" ? ed.otherLabel : FUNCTION_TYPE_LABELS[ed.functionType]} — {ed.date}
                  {ed.time ? `, ${ed.time}` : ""}
                  {ed.guestCount ? ` (${ed.guestCount} guests)` : ""}
                </p>
              ))}
            </div>
            <div className="mb-4 text-[13px]">
              <p className="font-bold">Wedding city</p>
              <p className="text-text-grey">{cities.find((c) => c.id === state.cityId)?.name ?? "Not specified"}</p>
            </div>
            <div className="mb-4 text-[13px]">
              <p className="font-bold">Total guests</p>
              <p className="text-text-grey">{state.guestCount || "Not specified"}</p>
            </div>
            <div className="mb-4 text-[13px]">
              <p className="font-bold">Phone number</p>
              <p className="text-text-grey">{state.phone || "Not specified"}</p>
            </div>
            <div className="text-[13px]">
              <p className="mb-1 font-bold">Categories &amp; budget</p>
              {state.categoryPreferences.map((cp) => {
                const category = categories.find((c) => c.id === cp.categoryId);
                return (
                  <p key={cp.categoryId} className="text-text-grey">
                    {category?.name ?? "Category"}
                    {cp.budgetMin || cp.budgetMax ? ` — ₹${cp.budgetMin || "0"} to ₹${cp.budgetMax || "any"}` : ""}
                  </p>
                );
              })}
            </div>
            {submitError && <p className="mt-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{submitError}</p>}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-3">
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
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        )}
      </div>
    </WizardGuard>
  );
}
