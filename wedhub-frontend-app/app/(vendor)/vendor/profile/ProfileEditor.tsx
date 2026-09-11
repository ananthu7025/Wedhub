"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  attachMyService,
  detachMyService,
  setMyAttributes,
  setMyCategories,
  setMyServiceAreas,
  submitMyVendor,
  upsertMyProfile,
} from "@/lib/api/vendor-self-client";
import { EVENTS_COMPLETED_RANGES, type CategorySelf, type LocationSelf, type VendorSelf } from "@/lib/api/vendor-self.types";
import { formatApiError } from "@/lib/utils/error";
import { getPublicMediaUrl } from "@/lib/media/url";
import { Badge } from "@/components/ui/Badge";
import { AttributesSection, type AttributeValue, type AttributeValueMap } from "./AttributesSection";
import { LogoCoverPicker } from "./LogoCoverPicker";
import { ServicesSection } from "./ServicesSection";

type TabId =
  | "basic-info"
  | "services-categories"
  | "location"
  | "pricing-policies"
  | "contact-social"
  | "more-details"
  | "attributes";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "basic-info", label: "Basic Info" },
  { id: "services-categories", label: "Services & Categories" },
  { id: "location", label: "Location" },
  { id: "pricing-policies", label: "Pricing & Policies" },
  { id: "contact-social", label: "Contact & Social" },
  { id: "more-details", label: "More Details" },
  { id: "attributes", label: "Category Details" },
];

// Same map as app/(public)/vendors/[slug]/page.tsx's VERIFICATION_LABEL —
// duplicated rather than imported since that one lives in a Server Component
// page file, not a shared module.
const VERIFICATION_LABEL: Record<string, string> = {
  UNVERIFIED: "",
  IDENTITY_VERIFIED: "✓ Identity Verified",
  BUSINESS_VERIFIED: "✓ Business Verified",
  PLATFORM_VERIFIED: "✓ Platform Verified",
};

// Mirrors wedhub-backend's vendor.completeness.ts CHECKS — re-derived
// against the form's current (possibly unsaved) state so the sidebar
// checklist updates live as the vendor types, since the backend only ever
// returns the single profileCompleteness score, never a live per-item
// breakdown.
interface CompletionCheck {
  label: string;
  met: boolean;
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

export function ProfileEditor({
  vendor,
  categories,
  cities,
}: {
  vendor: VendorSelf;
  categories: CategorySelf[];
  cities: LocationSelf[];
}) {
  const router = useRouter();
  const profile = vendor.profile;
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? null;
  const subcategoryIds = vendor.categories.filter((c) => !c.isPrimary).map((c) => c.categoryId);

  const [shortDescription, setShortDescription] = useState(profile?.shortDescription ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [logoMediaId, setLogoMediaId] = useState<string | null>(profile?.logoMediaId ?? null);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(profile?.coverMediaId ?? null);

  const [primaryCategoryId, setPrimaryCategoryId] = useState(primaryCategory?.id ?? categories[0]?.id ?? "");
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set(subcategoryIds));
  const originalServiceIds = new Set(vendor.services.map((s) => s.serviceId));
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set(originalServiceIds));
  const [tags, setTags] = useState(profile?.tags.join(", ") ?? "");
  const [vendorType, setVendorType] = useState(profile?.vendorType ?? "");

  const [cityId, setCityId] = useState(vendor.cityId ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [serviceAreaIds, setServiceAreaIds] = useState<Set<string>>(
    new Set(vendor.serviceAreas.map((a) => a.locationId)),
  );

  const [startingPrice, setStartingPrice] = useState(profile?.startingPrice ?? "");
  const [priceRangeMin, setPriceRangeMin] = useState(profile?.priceRangeMin ?? "");
  const [priceRangeMax, setPriceRangeMax] = useState(profile?.priceRangeMax ?? "");
  const [customQuoteAvailable, setCustomQuoteAvailable] = useState(profile?.customQuoteAvailable ?? false);
  const [advanceBookingPercent, setAdvanceBookingPercent] = useState(profile?.advanceBookingPercent?.toString() ?? "");
  const [cancellationPolicy, setCancellationPolicy] = useState(profile?.cancellationPolicy ?? "");

  const [yearsExperience, setYearsExperience] = useState(profile?.yearsExperience?.toString() ?? "");
  const [eventsCompletedRange, setEventsCompletedRange] = useState(profile?.eventsCompletedRange ?? "");

  const [website, setWebsite] = useState(profile?.website ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [instagram, setInstagram] = useState(profile?.socialLinks?.instagram ?? "");
  const [facebook, setFacebook] = useState(profile?.socialLinks?.facebook ?? "");
  const [youtube, setYoutube] = useState(profile?.socialLinks?.youtube ?? "");
  const [willingToTravel, setWillingToTravel] = useState<boolean | null>(profile?.willingToTravel ?? null);

  const [businessHours, setBusinessHours] = useState(profile?.businessHours?.general ?? "");
  const [travelPolicy, setTravelPolicy] = useState(profile?.travelPolicy ?? "");
  const [languages, setLanguages] = useState(profile?.languages.join(", ") ?? "");
  const [teamSize, setTeamSize] = useState(profile?.teamSize?.toString() ?? "");

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
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [categoryChangeWarningAcked, setCategoryChangeWarningAcked] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("basic-info");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    profile?.logoMedia?.optimizedObjectKey || profile?.logoMedia?.originalObjectKey
      ? getPublicMediaUrl((profile.logoMedia.optimizedObjectKey ?? profile.logoMedia.originalObjectKey) as string)
      : null,
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    profile?.coverMedia?.optimizedObjectKey || profile?.coverMedia?.originalObjectKey
      ? getPublicMediaUrl((profile.coverMedia.optimizedObjectKey ?? profile.coverMedia.originalObjectKey) as string)
      : null,
  );

  const primaryCategoryChanged = vendor.status === "APPROVED" && primaryCategoryId !== primaryCategory?.id;
  const selectedCategory = categories.find((c) => c.id === primaryCategoryId) ?? null;

  const completionChecks: CompletionCheck[] = [
    { label: "Business name", met: vendor.businessName.length > 0 },
    { label: "Short description", met: !!shortDescription },
    { label: "Full description", met: !!description },
    { label: "Primary category", met: !!primaryCategoryId },
    { label: "Primary city", met: !!cityId },
    { label: "At least one service area", met: serviceAreaIds.size > 0 },
    { label: "Pricing information", met: !!startingPrice || customQuoteAvailable },
    { label: "At least one package", met: vendor.packages.length > 0 },
    { label: "At least one service", met: selectedServiceIds.size > 0 },
    { label: "A contact method", met: !!(phone || email || website) },
    { label: "Category attribute values", met: Object.keys(attributeValues).length > 0 },
  ];

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

  // Returns whether the save succeeded, so handleFinish (the last tab's
  // action) can save every tab's changes first and only proceed to actually
  // submit for review if that save went through.
  async function handleSave(): Promise<boolean> {
    if (primaryCategoryChanged && !categoryChangeWarningAcked) {
      const confirmed = window.confirm(
        "Changing your primary category will require your listing to be re-reviewed by an admin before it's publicly visible again. Continue?",
      );
      if (!confirmed) return false;
      setCategoryChangeWarningAcked(true);
    }

    // Backend caps tags/languages at max(20) items, max(50) chars each
    // (vendor.schema.ts) — checked here so a too-long list fails before the
    // multi-request save sequence below starts, not partway through it.
    const tagList = tags ? toStringList(tags) : [];
    const languageList = languages ? toStringList(languages) : [];
    if (tagList.length > 20 || tagList.some((t) => t.length > 50)) {
      setStatus("error");
      setError("Tags: up to 20 tags, 50 characters each.");
      return false;
    }
    if (languageList.length > 20 || languageList.some((l) => l.length > 50)) {
      setStatus("error");
      setError("Languages: up to 20 languages, 50 characters each.");
      return false;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone.length < 6) {
      setStatus("error");
      setError("Phone number must be at least 6 characters.");
      return false;
    }

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
      return false;
    }

    setStatus("saving");
    setError("");

    const profileResult = await upsertMyProfile({
      shortDescription: shortDescription || undefined,
      description: description || undefined,
      vendorType: vendorType || undefined,
      tags: tags ? tagList : undefined,
      address: address || undefined,
      startingPrice: startingPrice ? Number(startingPrice) : undefined,
      priceRangeMin: priceRangeMin ? Number(priceRangeMin) : undefined,
      priceRangeMax: priceRangeMax ? Number(priceRangeMax) : undefined,
      customQuoteAvailable,
      yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
      teamSize: teamSize ? Number(teamSize) : undefined,
      languages: languages ? languageList : undefined,
      travelPolicy: travelPolicy || undefined,
      website: website.trim() ? normalizeUrl(website) : undefined,
      phone: trimmedPhone || undefined,
      email: email.trim() || undefined,
      socialLinks: instagram || facebook || youtube ? { instagram, facebook, youtube } : undefined,
      businessHours: businessHours ? { general: businessHours } : undefined,
      cityId: cityId || undefined,
      logoMediaId,
      coverMediaId,
      willingToTravel: willingToTravel ?? undefined,
      advanceBookingPercent: advanceBookingPercent ? Number(advanceBookingPercent) : undefined,
      cancellationPolicy: cancellationPolicy || undefined,
      eventsCompletedRange: eventsCompletedRange || undefined,
    });

    if (!profileResult.success) {
      setStatus("error");
      setError(formatApiError(profileResult.error));
      return false;
    }

    const categoriesResult = await setMyCategories({
      primaryCategoryId,
      subcategoryIds: Array.from(selectedSubcategoryIds),
    });
    if (!categoriesResult.success) {
      setStatus("error");
      setError(formatApiError(categoriesResult.error));
      return false;
    }

    const serviceAreasResult = await setMyServiceAreas({ locationIds: Array.from(serviceAreaIds) });
    if (!serviceAreasResult.success) {
      setStatus("error");
      setError(formatApiError(serviceAreasResult.error));
      return false;
    }

    // No bulk "set services" endpoint exists — attach/detach are individual
    // calls, so only the diff against what was originally loaded is synced.
    const toAttach = Array.from(selectedServiceIds).filter((id) => !originalServiceIds.has(id));
    const toDetach = Array.from(originalServiceIds).filter((id) => !selectedServiceIds.has(id));
    for (const serviceId of toAttach) {
      const result = await attachMyService({ serviceId });
      if (!result.success) {
        setStatus("error");
        setError(formatApiError(result.error));
        return false;
      }
    }
    for (const serviceId of toDetach) {
      const result = await detachMyService(serviceId);
      if (!result.success) {
        setStatus("error");
        setError(formatApiError(result.error));
        return false;
      }
    }

    const attributesResult = await setMyAttributes({
      values: Object.entries(attributeValues).map(([attributeId, value]) => ({ attributeId, value })),
    });
    if (!attributesResult.success) {
      setStatus("error");
      setError(formatApiError(attributesResult.error));
      return false;
    }

    setStatus("saved");
    router.refresh();
    return true;
  }

  // Only DRAFT/REJECTED vendors have a submit-for-review step (the backend
  // 409s otherwise) — for any other status the last tab's action is just a
  // save, same as every other tab's "Next" would otherwise silently defer.
  const canSubmitForReview = vendor.status === "DRAFT" || vendor.status === "REJECTED";

  async function handleFinish() {
    const saved = await handleSave();
    if (!saved || !canSubmitForReview) return;

    setStatus("saving");
    const result = await submitMyVendor();
    if (!result.success) {
      setStatus("error");
      setError(formatApiError(result.error));
      const missingDetail = result.error.details?.missing;
      if (Array.isArray(missingDetail)) setMissingFields(missingDetail as string[]);
      return;
    }
    router.push("/vendor/dashboard");
    router.refresh();
  }

  const activeTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const isLastTab = activeTabIndex === TABS.length - 1;

  return (
    <div>
      <div className="mb-5 sm:mb-6 bg-surface-page pt-1 sm:sticky sm:top-0 sm:z-20">
        <h1 className="text-xl sm:text-2xl font-bold">Edit profile</h1>
        <p className="text-xs sm:text-sm text-text-grey">This information is shown to couples on your public vendor page.</p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-7 max-[1100px]:grid-cols-1">
        <div className="flex flex-col gap-5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-[13px] font-bold ${
                  activeTab === t.id ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "basic-info" && (
          <section className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Basic information</h3>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Business name</span>
              <input value={vendor.businessName} disabled className="w-full rounded-md border border-border bg-surface-input px-3 py-2.5 text-sm text-text-grey" />
              <p className="mt-1 text-xs text-text-grey">Business name changes aren&apos;t self-service yet — contact support.</p>
            </label>
            <div className="mb-4">
              <LogoCoverPicker
                label="Logo / profile image"
                mediaId={logoMediaId}
                initialObjectKey={profile?.logoMedia?.optimizedObjectKey ?? profile?.logoMedia?.originalObjectKey ?? null}
                onChange={setLogoMediaId}
                onPreviewChange={setLogoPreviewUrl}
                mediaType="LOGO"
                shape="square"
              />
            </div>
            <div className="mb-4">
              <LogoCoverPicker
                label="Cover image"
                mediaId={coverMediaId}
                initialObjectKey={profile?.coverMedia?.optimizedObjectKey ?? profile?.coverMedia?.originalObjectKey ?? null}
                onChange={setCoverMediaId}
                onPreviewChange={setCoverPreviewUrl}
                mediaType="COVER"
                shape="wide"
              />
            </div>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Tagline / short description</span>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={150}
                className="min-h-[60px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-text-grey">
                {shortDescription.length}/150 — shown on search results and vendor cards.
              </p>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Full description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
                className="min-h-[140px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-text-grey">Shown in the About section of your public profile.</p>
            </label>
          </section>
          )}

          {activeTab === "services-categories" && (
          <section className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Services &amp; categories</h3>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Category</span>
              <select
                value={primaryCategoryId}
                onChange={(e) => {
                  setPrimaryCategoryId(e.target.value);
                  setSelectedSubcategoryIds(new Set());
                  setSelectedServiceIds(new Set());
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
                <p className="mt-1.5 text-xs text-amber-70">
                  Changing this will send your approved listing back for re-review.
                </p>
              )}
            </label>

            {selectedCategory && (
              <ServicesSection
                category={selectedCategory}
                selectedServiceIds={selectedServiceIds}
                onChange={setSelectedServiceIds}
              />
            )}

            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Tags</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
              <p className="mt-1 text-xs text-text-grey">Comma-separated keywords to improve search matching.</p>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Vendor type</span>
              <input
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
                placeholder="e.g. Studio, Individual, Company"
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
          </section>
          )}

          {activeTab === "location" && (
          <section className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Location</h3>
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
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} className="min-h-[70px] w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
            <div className="text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Service areas</span>
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
              <p className="mt-1.5 text-xs text-text-grey">Cities you&apos;re willing to travel to for weddings.</p>
            </div>
            <fieldset className="mt-3.5">
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
          </section>
          )}

          {activeTab === "pricing-policies" && (
          <section className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Pricing &amp; policies</h3>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Starting price (₹)</span>
              <input type="number" min="0" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-bold text-[13px]">Price range min (₹)</span>
                <input type="number" min="0" value={priceRangeMin} onChange={(e) => setPriceRangeMin(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-bold text-[13px]">Price range max (₹)</span>
                <input type="number" min="0" value={priceRangeMax} onChange={(e) => setPriceRangeMax(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
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
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Cancellation &amp; refund policy</span>
              <textarea
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                maxLength={1000}
                className="min-h-[70px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
            <p className="mt-2 text-[13px] text-text-grey">
              Detailed packages are managed separately.{" "}
              <a href="/vendor/packages" className="font-bold text-brand-primary no-underline">
                Manage packages →
              </a>
            </p>
          </section>
          )}

          {activeTab === "contact-social" && (
          <section className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Contact &amp; social</h3>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Website</span>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-bold text-[13px]">Phone</span>
                <input
                  type="tel"
                  minLength={6}
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-bold text-[13px]">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
              </label>
            </div>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Instagram</span>
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="instagram.com/yourhandle" className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Facebook</span>
              <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/yourpage" className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">YouTube / Vimeo</span>
              <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="youtube.com/@yourchannel" className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
          </section>
          )}

          {activeTab === "more-details" && (
          <>
          <section className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Trust &amp; credibility</h3>
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
            <label className="block text-sm">
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
          </section>

          <section className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Operational</h3>
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
              <input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Hindi, Kannada" className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Team size</span>
              <input type="number" min="0" max="10000" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
          </section>
          </>
          )}

          {activeTab === "attributes" && (
            <section className="rounded-xl border border-border bg-white p-6">
              <h3 className="mb-4 text-base font-bold">{selectedCategory ? `${selectedCategory.name} details` : "Category details"}</h3>
              {selectedCategory && selectedCategory.attributes.length > 0 ? (
                <AttributesSection
                  attributes={selectedCategory.attributes}
                  values={attributeValues}
                  onChange={setAttributeValues}
                  mediaByAttributeId={vendor.mediaByAttributeId}
                />
              ) : (
                <p className="text-sm text-text-grey">This category has no additional profile fields configured.</p>
              )}
            </section>
          )}

          <div className="rounded-xl border border-border bg-white p-5">
            {status === "error" && (
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
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab(TABS[activeTabIndex - 1].id)}
                disabled={activeTabIndex === 0}
                className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-bold text-text-dark hover:bg-surface-input disabled:opacity-0"
              >
                Back
              </button>
              {isLastTab ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={status === "saving"}
                  className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {status === "saving" ? "Saving…" : canSubmitForReview ? "Submit for review" : "Save changes"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab(TABS[activeTabIndex + 1].id)}
                  className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white"
                >
                  Next
                </button>
              )}
            </div>
            {isLastTab && (
              <p className="mt-2.5 text-xs text-text-grey">
                {canSubmitForReview
                  ? "This saves every tab's changes and submits your listing for admin approval."
                  : "This saves every tab's changes."}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5 max-[1100px]:order-first">
          <div className="sticky top-24 flex flex-col gap-5">
            <div className="overflow-hidden rounded-xl border border-border bg-white">
              <div
                className="h-24 bg-surface-input bg-cover bg-center"
                style={coverPreviewUrl ? { backgroundImage: `url(${coverPreviewUrl})` } : undefined}
              />
              <div className="px-4 pb-4">
                <div className="-mt-8 mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-surface-input text-xl font-bold text-text-grey shadow-sm">
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreviewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    vendor.businessName.charAt(0)
                  )}
                </div>
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <h3 className="text-sm font-bold">{vendor.businessName}</h3>
                  {VERIFICATION_LABEL[vendor.verificationLevel] && <Badge variant="green">{VERIFICATION_LABEL[vendor.verificationLevel]}</Badge>}
                </div>
                {shortDescription && <p className="mb-2 text-xs text-text-grey">{shortDescription}</p>}
                <p className="text-xs text-text-grey">
                  {cities.find((c) => c.id === cityId)?.name}
                  {cityId && primaryCategoryId && " · "}
                  {categories.find((c) => c.id === primaryCategoryId)?.name}
                </p>
                <a
                  href={`/vendors/${vendor.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block rounded-md border border-border px-3 py-2 text-center text-xs font-bold text-text-dark no-underline hover:bg-surface-input"
                >
                  View public profile
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="mb-1 text-sm font-bold">Profile completion</h3>
              <p className="mb-3 text-xs text-text-grey">{vendor.profileCompleteness}% complete</p>
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-surface-input">
                <div className="h-full rounded-full bg-brand-primary" style={{ width: `${vendor.profileCompleteness}%` }} />
              </div>
              <ul className="flex flex-col gap-1.5">
                {completionChecks.map((check) => (
                  <li key={check.label} className="flex items-center gap-2 text-xs">
                    <span className={check.met ? "text-emerald-600" : "text-text-grey"}>{check.met ? "✓" : "○"}</span>
                    <span className={check.met ? "text-text-dark" : "text-text-grey"}>{check.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
