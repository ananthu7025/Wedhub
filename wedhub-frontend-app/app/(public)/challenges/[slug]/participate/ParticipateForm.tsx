"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadChallengeEntryPhoto } from "@/lib/media/upload";
import { submitChallengeEntry } from "@/lib/api/challenges-client";
import { trackEvent } from "@/lib/analytics/track";
import { formatApiError } from "@/lib/utils/error";
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
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
    if (!file) {
      setError("Please upload a photo of your work.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the challenge terms to continue.");
      return;
    }
    if (needsVendorBootstrap && (!businessName || !shortDescription || !cityId)) {
      setError("Please fill in your artist name, a short description, and your city.");
      return;
    }

    setSubmitting(true);
    setError(null);

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
        setError(formatApiError(result.error));
        return;
      }

      trackEvent({ eventType: "challenge_entry_submit", metadata: { challengeSlug } });
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your entry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {needsVendorBootstrap && (
        <fieldset className="space-y-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-bold text-text-dark">About you</legend>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">Your artist/business name</span>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              placeholder="e.g. Priya Mehndi Art"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">One line about your Mehndi work</span>
            <input
              type="text"
              required
              maxLength={200}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              placeholder="e.g. Bridal mehndi specialist with 5+ years experience"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-grey">Where are you based?</span>
            <select
              required
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value);
                setCityName(e.target.selectedOptions[0]?.textContent ?? "");
              }}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            >
              <option value="">Select your city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
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
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              placeholder="e.g. 9999999999"
            />
          </label>
        </fieldset>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-bold text-text-grey">Challenge entry title</span>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          placeholder="e.g. Bridal Bloom Design"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold text-text-grey">Upload your best Mehndi work</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
        />
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

      <label className="flex items-start gap-2 text-xs text-text-grey">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5"
        />
        I accept the challenge terms and conditions
      </label>

      {error && <p className="text-xs text-red-70">{error}</p>}

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
