"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { uploadChallengeEntryPhoto } from "@/lib/media/upload";
import { submitChallengeEntry } from "@/lib/api/challenges-client";
import { trackEvent } from "@/lib/analytics/track";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { optionalPhoneSchema, validateField } from "@/lib/validation/auth-schemas";
import type { LocationSelf } from "@/lib/api/vendor-self.types";

/**
 * One form, two modes. When needsVendorBootstrap is false (caller already
 * has a matching-category vendor), only the entry fields show. When true
 * (no vendor profile yet), a few extra "About you" fields appear inline —
 * phrased as contest questions, not a vendor-signup wizard — that double as
 * the platform's real profile-completeness inputs (see
 * challenge-entry.vendor-bootstrap.ts). One combined submit either way.
 */
export function ParticipateForm({
  challengeSlug,
  needsVendorBootstrap,
  cities,
}: {
  challengeSlug: string;
  needsVendorBootstrap: boolean;
  cities: LocationSelf[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [cityName, setCityName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [customQuoteAvailable, setCustomQuoteAvailable] = useState(false);
  const [contactPhone, setContactPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<{
    title?: boolean;
    file?: boolean;
    acceptedTerms?: boolean;
    businessName?: boolean;
    shortDescription?: boolean;
    cityId?: boolean;
    contactPhone?: boolean;
  }>({});

  const titleError = title.trim() ? null : "Please add a title for your entry";
  const fileError = file ? null : "Please upload a photo of your work";
  const acceptedTermsError = acceptedTerms ? null : "Please accept the challenge terms to continue";
  const businessNameError = needsVendorBootstrap && !businessName.trim() ? "Please enter your artist/business name" : null;
  const shortDescriptionError =
    needsVendorBootstrap && !shortDescription.trim() ? "Please add a one-line description" : null;
  const cityIdError = needsVendorBootstrap && !cityId ? "Please select your city" : null;
  const contactPhoneError = useMemo(() => validateField(optionalPhoneSchema, contactPhone), [contactPhone]);

  const isFormValid =
    !titleError &&
    !fileError &&
    !acceptedTermsError &&
    !businessNameError &&
    !shortDescriptionError &&
    !cityIdError &&
    !contactPhoneError;

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-surface-input p-8 text-center">
        <p className="mb-2 text-lg font-bold text-text-dark">Your entry has been submitted for review.</p>
        <p className="text-sm text-text-grey">We&apos;ll let you know once it&apos;s approved and visible to everyone.</p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({
      title: true,
      file: true,
      acceptedTerms: true,
      businessName: true,
      shortDescription: true,
      cityId: true,
      contactPhone: true,
    });
    if (!isFormValid || !file) return;

    setSubmitting(true);

    try {
      const imageMediaId = await uploadChallengeEntryPhoto(file);

      const result = await submitChallengeEntry(challengeSlug, {
        title,
        description: description || undefined,
        imageMediaId,
        location: (needsVendorBootstrap ? cityName : location) || undefined,
        acceptedTerms: true,
        ...(needsVendorBootstrap
          ? {
              businessName,
              shortDescription,
              cityId,
              startingPrice: startingPrice ? Number(startingPrice) : undefined,
              customQuoteAvailable,
              contactPhone: contactPhone || undefined,
            }
          : {}),
      });

      if (!result.success) {
        showToast(formatApiError(result.error), "error");
        return;
      }

      trackEvent({ eventType: "challenge_entry_submit", metadata: { challengeSlug } });
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not submit your entry. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {needsVendorBootstrap && (
        <fieldset className="space-y-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-bold text-text-dark">About you</legend>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">Your artist/business name</span>
            <Input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, businessName: true }))}
              invalid={touched.businessName && !!businessNameError}
              placeholder="e.g. Priya Mehndi Art"
            />
            {touched.businessName && <FieldError message={businessNameError} />}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">One line about your Mehndi work</span>
            <Input
              type="text"
              maxLength={200}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, shortDescription: true }))}
              invalid={touched.shortDescription && !!shortDescriptionError}
              placeholder="e.g. Bridal mehndi specialist with 5+ years experience"
            />
            {touched.shortDescription && <FieldError message={shortDescriptionError} />}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">Where are you based?</span>
            <select
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value);
                setCityName(e.target.selectedOptions[0]?.textContent ?? "");
              }}
              onBlur={() => setTouched((t) => ({ ...t, cityId: true }))}
              className={`w-full rounded-md border px-3 py-2.5 text-sm ${
                touched.cityId && cityIdError ? "border-red focus:border-red" : "border-border focus:border-brand-primary"
              }`}
            >
              <option value="">Select your city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            {touched.cityId && <FieldError message={cityIdError} />}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">Starting price for a bridal look (₹)</span>
            <input
              type="number"
              min={0}
              value={startingPrice}
              disabled={customQuoteAvailable}
              onChange={(e) => setStartingPrice(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm disabled:bg-surface-input"
              placeholder="e.g. 5000"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-text-grey">
            <input
              type="checkbox"
              checked={customQuoteAvailable}
              onChange={(e) => setCustomQuoteAvailable(e.target.checked)}
            />
            I prefer to give custom quotes
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">WhatsApp number to contact you</span>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, contactPhone: true }))}
              invalid={touched.contactPhone && !!contactPhoneError}
              placeholder="e.g. 9999999999"
            />
            {touched.contactPhone && <FieldError message={contactPhoneError} />}
          </label>
        </fieldset>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-bold text-text-grey">Challenge entry title</span>
        <Input
          type="text"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, title: true }))}
          invalid={touched.title && !!titleError}
          placeholder="e.g. Bridal Bloom Design"
        />
        {touched.title && <FieldError message={titleError} />}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold text-text-grey">Upload your best Mehndi work</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setTouched((t) => ({ ...t, file: true }));
          }}
          className={`w-full rounded-md border px-3 py-2.5 text-sm ${
            touched.file && fileError ? "border-red focus:border-red" : "border-border focus:border-brand-primary"
          }`}
        />
        {touched.file && <FieldError message={fileError} />}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold text-text-grey">Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          placeholder="Tell us about this design"
        />
      </label>

      {!needsVendorBootstrap && (
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-text-grey">Location (optional)</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            placeholder="e.g. Kochi"
          />
        </label>
      )}

      <div>
        <label className="flex items-start gap-2 text-xs text-text-grey">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              setTouched((t) => ({ ...t, acceptedTerms: true }));
            }}
            className="mt-0.5"
          />
          I accept the challenge terms and conditions
        </label>
        {touched.acceptedTerms && <FieldError message={acceptedTermsError} />}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-brand-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit Entry"}
      </button>
    </form>
  );
}
