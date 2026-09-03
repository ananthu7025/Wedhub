"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  attachMyService,
  detachMyService,
  setMyAttributes,
  setMyCategories,
  setMyServiceAreas,
  upsertMyProfile,
} from "@/lib/api/vendor-self-client";
import type { CategorySelf, LocationSelf, VendorSelf } from "@/lib/api/vendor-self.types";
import { AttributesSection } from "./AttributesSection";
import { LogoCoverPicker } from "./LogoCoverPicker";
import { ServicesSection } from "./ServicesSection";
import { SubmitBar } from "./SubmitBar";

const SECTIONS = [
  { id: "identity", label: "Identity" },
  { id: "classification", label: "Classification" },
  { id: "location", label: "Location" },
  { id: "commercial", label: "Commercial" },
  { id: "trust", label: "Trust" },
  { id: "contact", label: "Contact" },
  { id: "operational", label: "Operational" },
  { id: "attributes", label: "Category Details" },
] as const;

function toStringList(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

  const [yearsExperience, setYearsExperience] = useState(profile?.yearsExperience?.toString() ?? "");

  const [website, setWebsite] = useState(profile?.website ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [instagram, setInstagram] = useState(profile?.socialLinks?.instagram ?? "");
  const [facebook, setFacebook] = useState(profile?.socialLinks?.facebook ?? "");

  const [businessHours, setBusinessHours] = useState(profile?.businessHours?.general ?? "");
  const [travelPolicy, setTravelPolicy] = useState(profile?.travelPolicy ?? "");
  const [languages, setLanguages] = useState(profile?.languages.join(", ") ?? "");
  const [teamSize, setTeamSize] = useState(profile?.teamSize?.toString() ?? "");

  const [attributeValues, setAttributeValues] = useState<Record<string, string | number | boolean | string[]>>(() => {
    const initial: Record<string, string | number | boolean | string[]> = {};
    for (const av of vendor.attributeValues) {
      if (av.valueText !== null) initial[av.attributeId] = av.valueText;
      else if (av.valueNumber !== null) initial[av.attributeId] = Number(av.valueNumber);
      else if (av.valueBoolean !== null) initial[av.attributeId] = av.valueBoolean;
      else if (av.valueOptions.length > 0) initial[av.attributeId] = av.valueOptions;
    }
    return initial;
  });

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [categoryChangeWarningAcked, setCategoryChangeWarningAcked] = useState(false);

  const primaryCategoryChanged = vendor.status === "APPROVED" && primaryCategoryId !== primaryCategory?.id;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (primaryCategoryChanged && !categoryChangeWarningAcked) {
      const confirmed = window.confirm(
        "Changing your primary category will require your listing to be re-reviewed by an admin before it's publicly visible again. Continue?",
      );
      if (!confirmed) return;
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
      return;
    }
    if (languageList.length > 20 || languageList.some((l) => l.length > 50)) {
      setStatus("error");
      setError("Languages: up to 20 languages, 50 characters each.");
      return;
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
      website: website || undefined,
      phone: phone || undefined,
      email: email || undefined,
      socialLinks: instagram || facebook ? { instagram, facebook } : undefined,
      businessHours: businessHours ? { general: businessHours } : undefined,
      cityId: cityId || undefined,
      logoMediaId,
      coverMediaId,
    });

    if (!profileResult.success) {
      setStatus("error");
      setError(profileResult.error.message);
      return;
    }

    const categoriesResult = await setMyCategories({
      primaryCategoryId,
      subcategoryIds: Array.from(selectedSubcategoryIds),
    });
    if (!categoriesResult.success) {
      setStatus("error");
      setError(categoriesResult.error.message);
      return;
    }

    const serviceAreasResult = await setMyServiceAreas({ locationIds: Array.from(serviceAreaIds) });
    if (!serviceAreasResult.success) {
      setStatus("error");
      setError(serviceAreasResult.error.message);
      return;
    }

    // No bulk "set services" endpoint exists — attach/detach are individual
    // calls, so only the diff against what was originally loaded is synced.
    const toAttach = Array.from(selectedServiceIds).filter((id) => !originalServiceIds.has(id));
    const toDetach = Array.from(originalServiceIds).filter((id) => !selectedServiceIds.has(id));
    for (const serviceId of toAttach) {
      const result = await attachMyService({ serviceId });
      if (!result.success) {
        setStatus("error");
        setError(result.error.message);
        return;
      }
    }
    for (const serviceId of toDetach) {
      const result = await detachMyService(serviceId);
      if (!result.success) {
        setStatus("error");
        setError(result.error.message);
        return;
      }
    }

    const attributesResult = await setMyAttributes({
      values: Object.entries(attributeValues).map(([attributeId, value]) => ({ attributeId, value })),
    });
    if (!attributesResult.success) {
      setStatus("error");
      setError(attributesResult.error.message);
      return;
    }

    setStatus("saved");
    router.refresh();
  }

  const selectedCategory = categories.find((c) => c.id === primaryCategoryId) ?? null;

  return (
    <form onSubmit={handleSave}>
      <div className="sticky top-0 z-40 mb-6 flex flex-wrap items-start justify-between gap-4 bg-surface-page pt-1">
        <div>
          <h1 className="text-2xl font-bold">Edit profile</h1>
          <p className="text-sm text-text-grey">This information is shown to couples on your public vendor page.</p>
        </div>
        <div className="flex items-center gap-3">
          {status === "error" && <span className="text-[13px] text-red">{error}</span>}
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-7 max-[1000px]:grid-cols-1">
        <nav className="sticky top-24 flex h-fit flex-col gap-0.5 max-[1000px]:static max-[1000px]:flex-row max-[1000px]:overflow-x-auto">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-md border-l-2 border-transparent px-3.5 py-2.5 text-[13px] font-semibold text-text-grey no-underline hover:bg-surface-input hover:text-text-dark"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-5">
          <section id="identity" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Identity</h3>
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
                mediaType="COVER"
                shape="wide"
              />
            </div>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Short description</span>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={300}
                className="min-h-[60px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-text-grey">Shown on search results and vendor cards.</p>
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

          <section id="classification" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Classification</h3>
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

          <section id="location" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
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
          </section>

          <section id="commercial" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Commercial</h3>
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
            <p className="mt-2 text-[13px] text-text-grey">
              Detailed packages are managed separately.{" "}
              <a href="/vendor/packages" className="font-bold text-brand-primary no-underline">
                Manage packages →
              </a>
            </p>
          </section>

          <section id="trust" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Trust &amp; credibility</h3>
            <div className="mb-3.5">
              <span className="mb-1.5 block text-[13px] font-bold">Verification status</span>
              <span className="inline-block rounded-full bg-neutral-grey-20 px-2.5 py-1 text-[11px] font-bold uppercase text-text-grey">
                {vendor.verificationLevel.replace(/_/g, " ")}
              </span>
              <p className="mt-1.5 text-xs text-text-grey">Vendors cannot self-verify — contact support to request verification.</p>
            </div>
            <label className="block text-sm">
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
          </section>

          <section id="contact" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Contact</h3>
            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Website</span>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-bold text-[13px]">Phone</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
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
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Facebook</span>
              <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/yourpage" className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
            </label>
          </section>

          <section id="operational" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
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

          {selectedCategory && selectedCategory.attributes.length > 0 && (
            <section id="attributes" className="scroll-mt-24 rounded-xl border border-border bg-white p-6">
              <h3 className="mb-4 text-base font-bold">{selectedCategory.name} details</h3>
              <AttributesSection
                attributes={selectedCategory.attributes}
                values={attributeValues}
                onChange={setAttributeValues}
              />
            </section>
          )}

          <SubmitBar vendorStatus={vendor.status} />
        </div>
      </div>
    </form>
  );
}
