"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setMyCategories,
  setMyServiceAreas,
  submitMyVendor,
  updateMyVendorDetail,
  upsertMyProfile,
} from "@/lib/api/vendor-self-client";
import { updateMyProfile } from "@/lib/api/users-client";
import { setNotificationPreference } from "@/lib/api/notification-preferences-client";
import { deactivateAccount } from "@/lib/api/account-client";
import { logout, logoutAllDevices } from "@/lib/api/auth-client";
import { ChangeEmailForm } from "@/components/shared/ChangeEmailForm";
import { EVENTS_COMPLETED_RANGES, type CategorySelf, type LocationSelf, type VendorSelf } from "@/lib/api/vendor-self.types";
import type { MeResponse } from "@/lib/api/account.types";
import type { NotificationChannel, NotificationEventType, NotificationPreference } from "@/lib/api/notification-preferences.types";
import { formatApiError } from "@/lib/utils/error";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { emailSchema, optionalPhoneSchema, validateField } from "@/lib/validation/auth-schemas";

/**
 * Settings page (Frontend Arch Phase 7, restructured item 12/21/13/1). Now
 * owns every field that used to live on the Profile editor's basic-info,
 * category, location, pricing-policies, contact-social, and more-details
 * tabs — the Profile page itself is now category-attributes-only (see
 * ../profile/ProfileEditor.tsx). Each section below is its own collapsible
 * <details> with its own save button and its own success/error state,
 * deliberately NOT a single all-or-nothing save: a vendor updating just
 * their price range no longer has to step through unrelated sections to do
 * it (item 21), and a failure in one section can never look like it
 * silently affected another (the old ProfileEditor's 4-call sequential save
 * had exactly that partial-failure risk).
 *
 * The mockup's "Team members" section is omitted entirely — confirmed via
 * backend research that no team/staff model exists anywhere (Vendor.ownerUserId
 * is a single nullable FK, no multi-user-per-vendor concept), so there is
 * nothing real to build against (per user decision, 2026-09-02).
 *
 * "Deactivate listing" is relabeled honestly as "Deactivate account" and
 * reuses the same generic POST /users/me/deactivate the couple account page
 * already calls — confirmed via research that this deactivates the LOGIN
 * (User.status), not the vendor listing itself (no code path anywhere sets
 * Vendor.status = DEACTIVATED, despite that enum value existing on the
 * schema). The mockup's copy ("hidden from search results... reactivate")
 * describes behavior the backend doesn't actually implement, so this UI
 * describes what really happens instead.
 */

const NOTIFICATION_TOGGLES: Array<{ eventType: NotificationEventType; channel: NotificationChannel; label: string; description: string }> = [
  { eventType: "NEW_LEAD", channel: "EMAIL", label: "New lead alerts (email)", description: "Get notified by email the moment a couple enquires" },
  { eventType: "NEW_LEAD", channel: "IN_APP", label: "New lead alerts (in-app)", description: "Show new-lead alerts inside the vendor dashboard" },
  { eventType: "REVIEW_RECEIVED", channel: "EMAIL", label: "Review alerts (email)", description: "Get notified by email when a couple leaves a review" },
  { eventType: "VENDOR_APPROVED", channel: "EMAIL", label: "Listing status updates (email)", description: "Approval, rejection, and verification updates" },
  { eventType: "SUBSCRIPTION_ACTIVATED", channel: "EMAIL", label: "Billing receipts (email)", description: "Payment confirmations and subscription updates" },
  { eventType: "PAYMENT_FAILED", channel: "EMAIL", label: "Payment failure alerts (email)", description: "Get notified immediately if a payment fails" },
];

function isEnabled(preferences: NotificationPreference[], eventType: NotificationEventType, channel: NotificationChannel): boolean {
  const row = preferences.find((p) => p.eventType === eventType && p.channel === channel);
  // Opt-out model: no row means enabled (see notification-preferences.types.ts).
  return row ? row.isEnabled : true;
}

function toStringList(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Shared save-state footer for every section below — a section-scoped
// error/success message, never a page-wide banner shared across unrelated
// forms (the old SettingsBoard's single saveError was set by three
// different handlers and rendered in two places at once).
function SectionStatus({ saving, saved, error }: { saving: boolean; saved: boolean; error: string | null }) {
  return (
    <>
      {error && <p className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-brand-primary px-5 py-2 text-[13px] font-bold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </>
  );
}

function SectionShell({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group mb-4 rounded-xl border border-border bg-white shadow-xs [&_summary::-webkit-details-marker]:hidden"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 sm:p-6">
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-text-grey">{description}</p>}
        </div>
        <span className="shrink-0 text-text-grey transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-neutral-grey-20 p-4 sm:p-6">{children}</div>
    </details>
  );
}

function BusinessInfoSection({ vendor, me }: { vendor: VendorSelf; me: MeResponse }) {
  const router = useRouter();
  const profile = vendor.profile;
  const [businessName, setBusinessName] = useState(vendor.businessName);
  const [firstName, setFirstName] = useState(me.profile?.firstName ?? "");
  const [lastName, setLastName] = useState(me.profile?.lastName ?? "");
  const [shortDescription, setShortDescription] = useState(profile?.shortDescription ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [touched, setTouched] = useState<{ businessName?: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend requires a non-empty business name (vendor.schema.ts: min(1)) —
  // this mirrors that so a vendor sees the problem before the save round-trip.
  const businessNameError = useMemo(
    () => (businessName.trim().length === 0 ? "Business name is required" : null),
    [businessName],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (businessNameError) {
      setTouched({ businessName: true });
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);

    const [vendorResult, userResult, profileResult] = await Promise.all([
      businessName.trim() !== vendor.businessName
        ? updateMyVendorDetail({ businessName: businessName.trim() })
        : Promise.resolve({ success: true as const, data: null }),
      updateMyProfile({ firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined }),
      upsertMyProfile({
        shortDescription: shortDescription.trim() ? shortDescription : null,
        description: description.trim() ? description : null,
      }),
    ]);
    setSaving(false);
    if (vendorResult.success && userResult.success && profileResult.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
      return;
    }
    const firstError = [vendorResult, userResult, profileResult].find((r) => !r.success);
    setError(firstError && !firstError.success ? formatApiError(firstError.error) : "Could not save your changes.");
  }

  return (
    <SectionShell title="Business info" description="Your name, description, and owner details" defaultOpen>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4 grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Business name</span>
            <Input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, businessName: true }))}
              invalid={touched.businessName && !!businessNameError}
              maxLength={200}
              className="px-3 py-2"
            />
            {touched.businessName && <FieldError message={businessNameError} />}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Owner first name</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Owner last name</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <div className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Email</span>
            <input type="email" value={me.email} disabled className="w-full rounded-md border border-border bg-surface-input px-3 py-2 text-sm text-text-grey" />
            <div className="mt-1.5">
              <ChangeEmailForm />
            </div>
          </div>
        </div>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Tagline / short description</span>
          <textarea
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={150}
            className="min-h-[60px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
          <p className="mt-1 text-xs text-text-grey">{shortDescription.length}/150 — shown on search results and vendor cards.</p>
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Full description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            className="min-h-[140px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
          <p className="mt-1 text-xs text-text-grey">Shown in the About section of your public profile.</p>
        </label>
        <SectionStatus saving={saving} saved={saved} error={error} />
      </form>
    </SectionShell>
  );
}

function CategoryLocationSection({
  vendor,
  categories,
  cities,
}: {
  vendor: VendorSelf;
  categories: CategorySelf[];
  cities: LocationSelf[];
}) {
  const router = useRouter();
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? null;
  const subcategoryIds = vendor.categories.filter((c) => !c.isPrimary).map((c) => c.categoryId);

  const [primaryCategoryId, setPrimaryCategoryId] = useState(primaryCategory?.id ?? categories[0]?.id ?? "");
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set(subcategoryIds));
  const [cityId, setCityId] = useState(vendor.cityId ?? "");
  const [address, setAddress] = useState(vendor.profile?.address ?? "");
  const [serviceAreaIds, setServiceAreaIds] = useState<Set<string>>(new Set(vendor.serviceAreas.map((a) => a.locationId)));
  const [servesAllAreas, setServesAllAreas] = useState(false);
  const [willingToTravel, setWillingToTravel] = useState<boolean | null>(vendor.profile?.willingToTravel ?? null);
  const [categoryChangeWarningAcked, setCategoryChangeWarningAcked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryCategoryChanged = vendor.status === "APPROVED" && primaryCategoryId !== primaryCategory?.id;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (primaryCategoryChanged && !categoryChangeWarningAcked) {
      const confirmed = window.confirm(
        "Changing your primary category will require your listing to be re-reviewed by an admin before it's publicly visible again. Continue?",
      );
      if (!confirmed) return;
      setCategoryChangeWarningAcked(true);
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    const profileResult = await upsertMyProfile({
      address: address.trim() ? address : null,
      cityId: cityId || undefined,
      willingToTravel: willingToTravel ?? undefined,
    });
    if (!profileResult.success) {
      setSaving(false);
      setError(formatApiError(profileResult.error));
      return;
    }

    const categoriesResult = await setMyCategories({
      primaryCategoryId,
      subcategoryIds: Array.from(selectedSubcategoryIds),
    });
    if (!categoriesResult.success) {
      setSaving(false);
      setError(formatApiError(categoriesResult.error));
      return;
    }

    // "Serves all areas" (item 13) is expressed today as selecting every
    // known city — see the note on the checkbox grid below for why this is
    // an interim UI-level implementation, not a real servesAllAreas column.
    const serviceAreaResult = await setMyServiceAreas({
      locationIds: servesAllAreas ? cities.map((c) => c.id) : Array.from(serviceAreaIds),
    });
    setSaving(false);
    if (!serviceAreaResult.success) {
      setError(formatApiError(serviceAreaResult.error));
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <SectionShell title="Category & location" description="Where you're based and what you offer">
      <form onSubmit={handleSubmit}>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Category</span>
          <select
            value={primaryCategoryId}
            onChange={(e) => {
              setPrimaryCategoryId(e.target.value);
              setSelectedSubcategoryIds(new Set());
            }}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {primaryCategoryChanged && (
            <p className="mt-1.5 text-xs text-amber-70">Changing this will send your approved listing back for re-review.</p>
          )}
        </label>

        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">City</span>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm">
            <option value="">Select a city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Address</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={300}
            className="min-h-[70px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>

        <div className="mb-1 text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Service areas</span>
          <label className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
            <input
              type="checkbox"
              checked={servesAllAreas}
              onChange={(e) => setServesAllAreas(e.target.checked)}
              className="accent-brand-primary"
            />
            I serve all areas
          </label>
          {/* Item 13: interim implementation. There's no dedicated
              "serves all areas" flag on the schema yet — checking this box
              selects every known city as a service area, which is
              functionally equivalent for search/filter matching today
              without needing a schema migration. */}
          {!servesAllAreas && (
            <div className="grid grid-cols-2 gap-2">
              {cities.map((city) => (
                <label key={city.id} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={serviceAreaIds.has(city.id)}
                    onChange={(e) => {
                      const next = new Set(serviceAreaIds);
                      if (e.target.checked) next.add(city.id);
                      else next.delete(city.id);
                      setServiceAreaIds(next);
                    }}
                    className="accent-brand-primary"
                  />
                  {city.name}
                </label>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-xs text-text-grey">Cities you&apos;re willing to travel to for weddings.</p>
        </div>

        <fieldset className="mb-4 mt-3.5">
          <legend className="mb-1.5 text-[13px] font-bold">Willing to travel for destination weddings?</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-[13px]">
              <input
                type="radio"
                name="willingToTravel"
                checked={willingToTravel === true}
                onChange={() => setWillingToTravel(true)}
                className="accent-brand-primary"
              />
              Yes
            </label>
            <label className="flex items-center gap-1.5 text-[13px]">
              <input
                type="radio"
                name="willingToTravel"
                checked={willingToTravel === false}
                onChange={() => setWillingToTravel(false)}
                className="accent-brand-primary"
              />
              No
            </label>
          </div>
        </fieldset>

        <SectionStatus saving={saving} saved={saved} error={error} />
      </form>
    </SectionShell>
  );
}

function PricingPoliciesSection({ vendor }: { vendor: VendorSelf }) {
  const router = useRouter();
  const profile = vendor.profile;
  const [startingPrice, setStartingPrice] = useState(profile?.startingPrice ?? "");
  const [priceRangeMin, setPriceRangeMin] = useState(profile?.priceRangeMin ?? "");
  const [priceRangeMax, setPriceRangeMax] = useState(profile?.priceRangeMax ?? "");
  const [customQuoteAvailable, setCustomQuoteAvailable] = useState(profile?.customQuoteAvailable ?? false);
  const [advanceBookingPercent, setAdvanceBookingPercent] = useState(profile?.advanceBookingPercent?.toString() ?? "");
  const [cancellationPolicy, setCancellationPolicy] = useState(profile?.cancellationPolicy ?? "");
  const [touched, setTouched] = useState<{ priceRangeMax?: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A max below min is never meaningful — same "range" idea the
  // vendor-onboarding form checks before letting the price range through.
  const priceRangeError = useMemo(() => {
    if (priceRangeMin === "" || priceRangeMax === "") return null;
    return Number(priceRangeMax) < Number(priceRangeMin) ? "Max must be greater than or equal to min" : null;
  }, [priceRangeMin, priceRangeMax]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (priceRangeError) {
      setTouched({ priceRangeMax: true });
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);

    const result = await upsertMyProfile({
      startingPrice: startingPrice ? Number(startingPrice) : undefined,
      priceRangeMin: priceRangeMin ? Number(priceRangeMin) : undefined,
      priceRangeMax: priceRangeMax ? Number(priceRangeMax) : undefined,
      customQuoteAvailable,
      advanceBookingPercent: advanceBookingPercent ? Number(advanceBookingPercent) : undefined,
      cancellationPolicy: cancellationPolicy.trim() ? cancellationPolicy : null,
    });
    setSaving(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <SectionShell title="Pricing & policies" description="Starting price, range, and cancellation terms">
      <form onSubmit={handleSubmit} noValidate>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Starting price (₹)</span>
          <input type="number" min="0" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </label>
        <div className="mb-3.5 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Price range min (₹)</span>
            <input
              type="number"
              min="0"
              value={priceRangeMin}
              onChange={(e) => setPriceRangeMin(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, priceRangeMax: true }))}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Price range max (₹)</span>
            <Input
              type="number"
              min="0"
              value={priceRangeMax}
              onChange={(e) => setPriceRangeMax(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, priceRangeMax: true }))}
              invalid={touched.priceRangeMax && !!priceRangeError}
              className="px-3 py-2.5"
            />
            {touched.priceRangeMax && <FieldError message={priceRangeError} />}
          </label>
        </div>
        <label className="flex items-center justify-between gap-4 py-2">
          <span className="text-[13px] font-bold">Custom quotation availability</span>
          <input
            type="checkbox"
            checked={customQuoteAvailable}
            onChange={(e) => setCustomQuoteAvailable(e.target.checked)}
            className="h-5 w-5 accent-brand-primary"
          />
        </label>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Advance booking amount (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={advanceBookingPercent}
            onChange={(e) => setAdvanceBookingPercent(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Cancellation &amp; refund policy</span>
          <textarea
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            maxLength={1000}
            className="min-h-[70px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <p className="mb-4 text-[13px] text-text-grey">
          Detailed packages are managed separately.{" "}
          <a href="/vendor/packages" className="font-bold text-brand-primary no-underline">
            Manage packages →
          </a>
        </p>
        <SectionStatus saving={saving} saved={saved} error={error} />
      </form>
    </SectionShell>
  );
}

// Website/social fields are stored as free-text, then normalized to a full
// https:// URL on save (see normalizeUrl) — so what's actually validatable
// client-side is that the normalized result is at least a plausible URL,
// not the raw text the vendor typed (which may just be "example.com").
function optionalUrlError(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  const normalized = normalizeUrl(trimmed);
  try {
    new URL(normalized);
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

// Email here is optional (unlike the account email in BusinessInfoSection) —
// empty is valid, anything non-empty must pass the same shape check as
// emailSchema without forcing the field to be filled in.
function optionalEmailError(rawValue: string): string | null {
  if (!rawValue.trim()) return null;
  return validateField(emailSchema, rawValue);
}

function ContactSocialSection({ vendor }: { vendor: VendorSelf }) {
  const router = useRouter();
  const profile = vendor.profile;
  const [website, setWebsite] = useState(profile?.website ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [instagram, setInstagram] = useState(profile?.socialLinks?.instagram ?? "");
  const [facebook, setFacebook] = useState(profile?.socialLinks?.facebook ?? "");
  const [youtube, setYoutube] = useState(profile?.socialLinks?.youtube ?? "");
  const [touched, setTouched] = useState<{
    website?: boolean;
    phone?: boolean;
    email?: boolean;
    instagram?: boolean;
    facebook?: boolean;
    youtube?: boolean;
  }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const websiteError = useMemo(() => optionalUrlError(website), [website]);
  const phoneError = useMemo(() => validateField(optionalPhoneSchema, phone), [phone]);
  const emailError = useMemo(() => optionalEmailError(email), [email]);
  const instagramError = useMemo(() => optionalUrlError(instagram), [instagram]);
  const facebookError = useMemo(() => optionalUrlError(facebook), [facebook]);
  const youtubeError = useMemo(() => optionalUrlError(youtube), [youtube]);
  const isFormValid = !websiteError && !phoneError && !emailError && !instagramError && !facebookError && !youtubeError;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isFormValid) {
      setTouched({ website: true, phone: true, email: true, instagram: true, facebook: true, youtube: true });
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);

    const trimmedPhone = phone.trim();
    const result = await upsertMyProfile({
      website: website.trim() ? normalizeUrl(website) : null,
      phone: trimmedPhone || null,
      email: email.trim() ? email.trim() : null,
      socialLinks: instagram || facebook || youtube ? { instagram, facebook, youtube } : undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <SectionShell title="Contact & social" description="How couples reach you, and your social links">
      <form onSubmit={handleSubmit} noValidate>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Website</span>
          <Input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, website: true }))}
            invalid={touched.website && !!websiteError}
            placeholder="https://example.com"
            className="px-3 py-2.5"
          />
          {touched.website && <FieldError message={websiteError} />}
        </label>
        <div className="mb-3.5 grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
          <label className="block text-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-bold text-[13px]">Contact Phone *</span>
              <span className="text-[11px] font-semibold text-brand-primary">Required</span>
            </div>
            <Input
              type="tel"
              maxLength={20}
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              invalid={touched.phone && !!phoneError}
              className="px-3 py-2.5"
            />
            {touched.phone && <FieldError message={phoneError} />}
          </label>
          <label className="block text-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-bold text-[13px]">Contact Email</span>
              <span className="text-[11px] text-text-grey">From account</span>
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              invalid={touched.email && !!emailError}
              className="px-3 py-2.5"
            />
            {touched.email && <FieldError message={emailError} />}
          </label>
        </div>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Instagram</span>
          <Input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, instagram: true }))}
            invalid={touched.instagram && !!instagramError}
            placeholder="instagram.com/yourhandle"
            className="px-3 py-2.5"
          />
          {touched.instagram && <FieldError message={instagramError} />}
        </label>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Facebook</span>
          <Input
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, facebook: true }))}
            invalid={touched.facebook && !!facebookError}
            placeholder="facebook.com/yourpage"
            className="px-3 py-2.5"
          />
          {touched.facebook && <FieldError message={facebookError} />}
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">YouTube / Vimeo</span>
          <Input
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, youtube: true }))}
            invalid={touched.youtube && !!youtubeError}
            placeholder="youtube.com/@yourchannel"
            className="px-3 py-2.5"
          />
          {touched.youtube && <FieldError message={youtubeError} />}
        </label>
        <SectionStatus saving={saving} saved={saved} error={error} />
      </form>
    </SectionShell>
  );
}

function MoreDetailsSection({ vendor }: { vendor: VendorSelf }) {
  const router = useRouter();
  const profile = vendor.profile;
  const [yearsExperience, setYearsExperience] = useState(profile?.yearsExperience?.toString() ?? "");
  const [eventsCompletedRange, setEventsCompletedRange] = useState(profile?.eventsCompletedRange ?? "");
  const [businessHours, setBusinessHours] = useState(profile?.businessHours?.general ?? "");
  const [travelPolicy, setTravelPolicy] = useState(profile?.travelPolicy ?? "");
  const [languages, setLanguages] = useState(profile?.languages.join(", ") ?? "");
  const [teamSize, setTeamSize] = useState(profile?.teamSize?.toString() ?? "");
  const [touched, setTouched] = useState<{ languages?: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const languagesError = useMemo(() => {
    const languageList = languages ? toStringList(languages) : [];
    if (languageList.length > 20) return "Up to 20 languages allowed";
    if (languageList.some((l) => l.length > 50)) return "Each language must be 50 characters or fewer";
    return null;
  }, [languages]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const languageList = languages ? toStringList(languages) : [];
    if (languagesError) {
      setTouched({ languages: true });
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);

    const result = await upsertMyProfile({
      yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
      eventsCompletedRange: eventsCompletedRange || undefined,
      businessHours: businessHours.trim() ? { general: businessHours } : undefined,
      travelPolicy: travelPolicy.trim() ? travelPolicy : null,
      languages: languages ? languageList : undefined,
      teamSize: teamSize ? Number(teamSize) : undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <SectionShell title="More details" description="Experience, business hours, and team">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3.5">
          <span className="mb-1.5 block text-[13px] font-bold">Verification status</span>
          <span className="inline-block rounded-full bg-neutral-grey-20 px-2.5 py-1 text-[11px] font-bold uppercase text-text-grey">
            {vendor.verificationLevel.replace(/_/g, " ")}
          </span>
          <p className="mt-1.5 text-xs text-text-grey">Vendors cannot self-verify — contact support to request verification.</p>
        </div>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Years of experience</span>
          <input
            type="number"
            min="0"
            max="100"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Events completed</span>
          <select
            value={eventsCompletedRange}
            onChange={(e) => setEventsCompletedRange(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          >
            <option value="">Select…</option>
            {EVENTS_COMPLETED_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Business hours</span>
          <input
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            placeholder="e.g. Mon–Sat, 10 AM – 7 PM"
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Travel policy</span>
          <textarea value={travelPolicy} onChange={(e) => setTravelPolicy(e.target.value)} maxLength={500} className="min-h-[70px] w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </label>
        <label className="mb-3.5 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Languages spoken</span>
          <Input
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, languages: true }))}
            invalid={touched.languages && !!languagesError}
            placeholder="English, Hindi, Kannada"
            className="px-3 py-2.5"
          />
          {touched.languages && <FieldError message={languagesError} />}
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Team size</span>
          <input type="number" min="0" max="10000" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </label>
        <SectionStatus saving={saving} saved={saved} error={error} />
      </form>
    </SectionShell>
  );
}

// Item 12/21: this is now where "Submit for review" lives, since Business
// Info/Category & Location/Pricing/Contact above cover 4 of the 5 fields
// vendor.completeness.ts requires for submission (description, category,
// city, contact method) — the Profile page's category-attributes tab is the
// 5th signal but isn't submission-blocking on its own. A DRAFT/REJECTED
// vendor submits from here once those sections are filled in; any other
// status just shows their current listing status.
function SubmitForReviewSection({ vendor }: { vendor: VendorSelf }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const canSubmitForReview = vendor.status === "DRAFT" || vendor.status === "REJECTED";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setMissingFields([]);
    const result = await submitMyVendor();
    setSubmitting(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      const missingDetail = result.error.details?.missing;
      if (Array.isArray(missingDetail)) setMissingFields(missingDetail as string[]);
      return;
    }
    router.push("/vendor/dashboard");
    router.refresh();
  }

  const statusCopy: Record<string, string> = {
    DRAFT: "Your listing hasn't been submitted yet.",
    PENDING_VERIFICATION: "Submitted — verify your email to move into the review queue.",
    PENDING_APPROVAL: "Submitted and waiting for admin review.",
    APPROVED: "Your listing is live and visible to couples.",
    REJECTED: vendor.rejectionReason
      ? `Your last submission was rejected: ${vendor.rejectionReason}`
      : "Your last submission was rejected. Update your profile and resubmit.",
    SUSPENDED: "Your listing is currently suspended. Contact support for details.",
    DEACTIVATED: "Your account is deactivated.",
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4 sm:p-6 shadow-xs">
      <h3 className="mb-1 text-base font-bold">Listing status</h3>
      <p className="mb-4 text-[13px] text-text-grey">{statusCopy[vendor.status] ?? vendor.status}</p>
      {error && (
        <div className="mb-3.5 rounded-md bg-red-10 p-3.5 text-[13px] text-red-70">
          <p className="mb-1 font-semibold">{error}</p>
          {missingFields.length > 0 && (
            <ul className="ml-4 list-disc">
              {missingFields.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {canSubmitForReview && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      )}
    </div>
  );
}

export function SettingsBoard({
  vendor,
  me,
  categories,
  cities,
  initialPreferences,
}: {
  vendor: VendorSelf;
  me: MeResponse;
  categories: CategorySelf[];
  cities: LocationSelf[];
  initialPreferences: NotificationPreference[];
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const [deactivating, setDeactivating] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [logoutAllError, setLogoutAllError] = useState<string | null>(null);

  async function handleToggle(eventType: NotificationEventType, channel: NotificationChannel, nextValue: boolean) {
    const key = `${eventType}:${channel}`;
    setSavingToggle(key);
    setNotificationError(null);
    const result = await setNotificationPreference({ eventType, channel, isEnabled: nextValue });
    setSavingToggle(null);
    if (result.success) {
      setPreferences((prev) => {
        const existing = prev.find((p) => p.eventType === eventType && p.channel === channel);
        if (existing) return prev.map((p) => (p === existing ? result.data : p));
        return [...prev, result.data];
      });
    } else {
      setNotificationError(formatApiError(result.error));
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    setDeactivateError(null);
    const result = await deactivateAccount();
    if (result.success) {
      await logout();
      router.push("/login");
      return;
    }
    setDeactivating(false);
    setDeactivateError(formatApiError(result.error));
  }

  async function handleLogoutAllDevices() {
    setLoggingOutAll(true);
    setLogoutAllError(null);
    const result = await logoutAllDevices();
    if (result.success) {
      router.push("/login");
      return;
    }
    setLoggingOutAll(false);
    setLogoutAllError(formatApiError(result.error));
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
        <p className="text-xs sm:text-sm text-text-grey">Manage your business account and notifications.</p>
      </div>

      <BusinessInfoSection vendor={vendor} me={me} />
      <CategoryLocationSection vendor={vendor} categories={categories} cities={cities} />
      <PricingPoliciesSection vendor={vendor} />
      <ContactSocialSection vendor={vendor} />
      <MoreDetailsSection vendor={vendor} />

      <SectionShell title="Notification preferences">
        {notificationError && <p className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{notificationError}</p>}
        {NOTIFICATION_TOGGLES.map(({ eventType, channel, label, description }) => {
          const key = `${eventType}:${channel}`;
          const checked = isEnabled(preferences, eventType, channel);
          return (
            <div key={key} className="flex items-center justify-between border-b border-neutral-grey-20 py-3.5 last:border-b-0">
              <div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-text-grey">{description}</div>
              </div>
              <label className="relative inline-flex h-[22px] w-10 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={savingToggle === key}
                  onChange={(e) => handleToggle(eventType, channel, e.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-brand-primary" />
                <span className="absolute left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
              </label>
            </div>
          );
        })}
      </SectionShell>

      <SectionShell title="Security">
        <p className="mb-4 text-[13.5px] text-text-grey">
          Signed in on a device you don&apos;t recognize, or lost access to one? Log out everywhere to end every
          active session, including this one — you&apos;ll need to sign in again.
        </p>
        {logoutAllError && <p className="mb-3 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{logoutAllError}</p>}
        <button
          onClick={handleLogoutAllDevices}
          disabled={loggingOutAll}
          className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark disabled:opacity-60"
        >
          {loggingOutAll ? "Logging out everywhere…" : "Log out of all devices"}
        </button>
      </SectionShell>

      <div className="mb-4 rounded-xl border border-red-10 bg-white p-4 sm:p-6">
        <h3 className="mb-3 text-base font-bold text-red-70">Danger zone</h3>
        <p className="mb-4 text-[13.5px] text-text-grey">
          Deactivating your account signs you out and disables login. Your vendor listing and its data are not
          deleted, but you won&apos;t be able to access this dashboard again unless support reactivates your account.
        </p>
        {deactivateError && <p className="mb-3 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{deactivateError}</p>}
        {confirmingDeactivate ? (
          <div className="flex gap-2">
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {deactivating ? "Deactivating…" : "Yes, deactivate my account"}
            </button>
            <button
              onClick={() => setConfirmingDeactivate(false)}
              className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDeactivate(true)}
            className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white"
          >
            Deactivate account
          </button>
        )}
      </div>

      <SubmitForReviewSection vendor={vendor} />
    </div>
  );
}
