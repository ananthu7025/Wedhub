"use client";

import { useRef, useState } from "react";
import { updateMyCatalogStoreSettings } from "@/lib/api/vendor-catalog-client";
import { createMediaUploadRequest, confirmMediaUpload } from "@/lib/api/vendor-self-client";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import { UPLOAD_CACHE_CONTROL } from "@/lib/media/upload";
import type {
  CatalogFooterLink,
  CatalogStoreSettings,
  CatalogTrustBadge,
  StoreAccentColor,
  UpdateCatalogStoreSettingsInput,
} from "@/lib/api/vendor-catalog.types";

const ACCENT_COLOR_OPTIONS: { value: StoreAccentColor; label: string; swatchClass: string }[] = [
  { value: "CRIMSON", label: "Crimson", swatchClass: "bg-brand-primary" },
  { value: "EMERALD", label: "Emerald", swatchClass: "bg-emerald" },
  { value: "NAVY", label: "Navy", swatchClass: "bg-byzantine-blue" },
  { value: "AMBER", label: "Amber", swatchClass: "bg-amber" },
  { value: "PLUM", label: "Plum", swatchClass: "bg-purple-600" },
  { value: "SLATE", label: "Slate", swatchClass: "bg-jet-black" },
];

const TABS = ["Banner & Theme", "Hero", "Sections", "Promo Banner", "Gallery", "Trust Badges", "Footer"] as const;
type Tab = (typeof TABS)[number];

function TextField({
  label,
  placeholder,
  value,
  onChange,
  textarea,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="block font-bold text-neutral-800 mb-1">{label}</label>
      {textarea ? (
        <textarea
          rows={2}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
        />
      )}
    </div>
  );
}

export function CatalogStorefrontCustomizer({
  initialSettings,
  onClose,
}: {
  initialSettings?: CatalogStoreSettings | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Banner & Theme");

  const [bannerMediaId, setBannerMediaId] = useState<string | null | undefined>(undefined);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(initialSettings?.bannerUrl ?? null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [accentColor, setAccentColor] = useState<StoreAccentColor>(initialSettings?.accentColor ?? "CRIMSON");

  const [heroHeadline, setHeroHeadline] = useState(initialSettings?.heroHeadline ?? "");
  const [heroTagline, setHeroTagline] = useState(initialSettings?.heroTagline ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(initialSettings?.heroSubtitle ?? "");
  const [announcementText, setAnnouncementText] = useState(initialSettings?.announcementText ?? "");
  const [shopButtonText, setShopButtonText] = useState(initialSettings?.shopButtonText ?? "");
  const [trialButtonText, setTrialButtonText] = useState(initialSettings?.trialButtonText ?? "");

  const [categorySectionHeading, setCategorySectionHeading] = useState(initialSettings?.categorySectionHeading ?? "");
  const [categorySectionSubheading, setCategorySectionSubheading] = useState(
    initialSettings?.categorySectionSubheading ?? "",
  );
  const [featuredSectionHeading, setFeaturedSectionHeading] = useState(initialSettings?.featuredSectionHeading ?? "");
  const [featuredSectionSubheading, setFeaturedSectionSubheading] = useState(
    initialSettings?.featuredSectionSubheading ?? "",
  );

  const [promoEyebrow, setPromoEyebrow] = useState(initialSettings?.promoEyebrow ?? "");
  const [promoHeading, setPromoHeading] = useState(initialSettings?.promoHeading ?? "");
  const [promoDescription, setPromoDescription] = useState(initialSettings?.promoDescription ?? "");
  const [promoQuote, setPromoQuote] = useState(initialSettings?.promoQuote ?? "");

  const [galleryHeading, setGalleryHeading] = useState(initialSettings?.galleryHeading ?? "");
  const [gallerySubheading, setGallerySubheading] = useState(initialSettings?.gallerySubheading ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initialSettings?.instagramUrl ?? "");

  const [trustBadges, setTrustBadges] = useState<CatalogTrustBadge[]>(initialSettings?.trustBadges ?? []);

  const [footerAboutText, setFooterAboutText] = useState(initialSettings?.footerAboutText ?? "");
  const [footerQuickLinksHeading, setFooterQuickLinksHeading] = useState(
    initialSettings?.footerQuickLinksHeading ?? "",
  );
  const [footerSupportHeading, setFooterSupportHeading] = useState(initialSettings?.footerSupportHeading ?? "");
  const [footerSocialHeading, setFooterSocialHeading] = useState(initialSettings?.footerSocialHeading ?? "");
  const [footerLinks, setFooterLinks] = useState<CatalogFooterLink[]>(initialSettings?.footerLinks ?? []);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    setSettingsError(null);

    try {
      const compressed = await compressImageIfPossible(file);
      const reqRes = await createMediaUploadRequest({
        mediaType: "CATALOG_ITEM_PHOTO",
        filename: compressed.name,
        mimeType: compressed.type || "image/jpeg",
        fileSize: compressed.size,
      });

      if (!reqRes.success) {
        throw new Error(typeof reqRes.error === "string" ? reqRes.error : reqRes.error?.message || "Failed to initialize upload");
      }

      const { mediaId, uploadUrl } = reqRes.data;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": compressed.type || "image/jpeg", "Cache-Control": UPLOAD_CACHE_CONTROL },
        body: compressed,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload banner image to storage");

      await confirmMediaUpload(mediaId);

      setBannerMediaId(mediaId);
      setBannerPreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Banner upload failed");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  }

  function addTrustBadge() {
    if (trustBadges.length >= 4) return;
    setTrustBadges((prev) => [...prev, { title: "", subtitle: "" }]);
  }

  function updateTrustBadge(index: number, field: "title" | "subtitle", value: string) {
    setTrustBadges((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function removeTrustBadge(index: number) {
    setTrustBadges((prev) => prev.filter((_, i) => i !== index));
  }

  function addFooterLink() {
    if (footerLinks.length >= 12) return;
    setFooterLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function updateFooterLink(index: number, field: "label" | "url", value: string) {
    setFooterLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function removeFooterLink(index: number) {
    setFooterLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSavingSettings(true);
    setSettingsError(null);

    const cleanBadges = trustBadges.filter((b) => b.title.trim() && b.subtitle.trim());
    const cleanLinks = footerLinks.filter((l) => l.label.trim() && l.url.trim());

    const body: UpdateCatalogStoreSettingsInput = {
      bannerMediaId,
      accentColor,
      heroHeadline: heroHeadline.trim() || null,
      heroTagline: heroTagline.trim() || null,
      heroSubtitle: heroSubtitle.trim() || null,
      announcementText: announcementText.trim() || null,
      shopButtonText: shopButtonText.trim() || null,
      trialButtonText: trialButtonText.trim() || null,
      categorySectionHeading: categorySectionHeading.trim() || null,
      categorySectionSubheading: categorySectionSubheading.trim() || null,
      featuredSectionHeading: featuredSectionHeading.trim() || null,
      featuredSectionSubheading: featuredSectionSubheading.trim() || null,
      promoEyebrow: promoEyebrow.trim() || null,
      promoHeading: promoHeading.trim() || null,
      promoDescription: promoDescription.trim() || null,
      promoQuote: promoQuote.trim() || null,
      galleryHeading: galleryHeading.trim() || null,
      gallerySubheading: gallerySubheading.trim() || null,
      instagramUrl: instagramUrl.trim() || null,
      trustBadges: cleanBadges.length > 0 ? cleanBadges : null,
      footerAboutText: footerAboutText.trim() || null,
      footerQuickLinksHeading: footerQuickLinksHeading.trim() || null,
      footerSupportHeading: footerSupportHeading.trim() || null,
      footerSocialHeading: footerSocialHeading.trim() || null,
      footerLinks: cleanLinks.length > 0 ? cleanLinks : null,
    };

    const res = await updateMyCatalogStoreSettings(body);
    setSavingSettings(false);

    if (!res.success) {
      setSettingsError(typeof res.error === "string" ? res.error : res.error?.message || "Failed to save settings");
      return;
    }

    setSavedSettingsNotice(true);
    setTimeout(() => {
      setSavedSettingsNotice(false);
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 sm:px-7 pt-6 pb-4">
          <div>
            <h3 className="font-bold text-base text-neutral-900">Customize Storefront</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Everything shown on your public catalog page is set here — a section stays hidden until you fill it in.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-6 sm:px-7 pt-3 border-b border-neutral-100 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3 py-2 text-xs font-bold rounded-t-lg transition ${
                activeTab === tab
                  ? "text-brand-primary border-b-2 border-brand-primary"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-7 py-5 space-y-4 text-xs">
          {activeTab === "Banner & Theme" && (
            <>
              <div>
                <label className="block font-bold text-neutral-800 mb-1">Banner Image</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-28 flex-shrink-0 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50">
                    {bannerPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bannerPreviewUrl} alt="Storefront banner" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-400">
                        No banner
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={uploadingBanner}
                      onClick={() => bannerInputRef.current?.click()}
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                    >
                      {uploadingBanner ? "Uploading…" : bannerPreviewUrl ? "Replace" : "Upload banner"}
                    </button>
                    {bannerPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setBannerMediaId(null);
                          setBannerPreviewUrl(null);
                        }}
                        className="text-[11px] font-semibold text-red-600 hover:underline text-left"
                      >
                        Remove banner
                      </button>
                    )}
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBannerUpload}
                    className="sr-only"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Falls back to your vendor cover photo or your first catalog item&apos;s photo when not set.
                </p>
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAccentColor(opt.value)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                        accentColor === opt.value
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${opt.swatchClass}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "Hero" && (
            <>
              <TextField
                label="Hero Main Headline"
                placeholder="e.g. Exquisite Bridal Suites for Your Special Day"
                value={heroHeadline}
                onChange={setHeroHeadline}
              />
              <TextField
                label="Pre-Heading Tagline"
                placeholder="e.g. Tradition Meets Timeless Beauty"
                value={heroTagline}
                onChange={setHeroTagline}
              />
              <TextField
                label="Hero Description / Subtitle"
                placeholder="e.g. Handcrafted rental pieces curated for unforgettable moments."
                value={heroSubtitle}
                onChange={setHeroSubtitle}
                textarea
              />
              <TextField
                label="Top Announcement Ticker"
                placeholder="e.g. 100% Sanitized & Handcrafted Suites · Studio Trials Available · Flexible Rental Dates"
                value={announcementText}
                onChange={setAnnouncementText}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Shop CTA Button Label"
                  placeholder="e.g. Shop Collection"
                  value={shopButtonText}
                  onChange={setShopButtonText}
                />
                <TextField
                  label="Trial CTA Button Label"
                  placeholder="e.g. Book a Studio Trial"
                  value={trialButtonText}
                  onChange={setTrialButtonText}
                />
              </div>
            </>
          )}

          {activeTab === "Sections" && (
            <>
              <p className="text-[11px] text-neutral-500">
                Headings for the sections that browse your catalog items. Each stays hidden until you set it.
              </p>
              <TextField
                label='"Shop by Category" Heading'
                placeholder="e.g. Shop by Category"
                value={categorySectionHeading}
                onChange={setCategorySectionHeading}
              />
              <TextField
                label='"Shop by Category" Subheading'
                placeholder="e.g. Explore our handcrafted collections"
                value={categorySectionSubheading}
                onChange={setCategorySectionSubheading}
              />
              <TextField
                label='"Featured" Section Heading'
                placeholder="e.g. Featured Collections"
                value={featuredSectionHeading}
                onChange={setFeaturedSectionHeading}
              />
              <TextField
                label='"Featured" Section Subheading'
                placeholder="e.g. Our most loved pieces, curated for you"
                value={featuredSectionSubheading}
                onChange={setFeaturedSectionSubheading}
              />
            </>
          )}

          {activeTab === "Promo Banner" && (
            <>
              <p className="text-[11px] text-neutral-500">
                An optional promo block (e.g. a studio-trial invite). Hidden entirely until you set a heading.
              </p>
              <TextField label="Eyebrow Label" placeholder="e.g. Studio Trials" value={promoEyebrow} onChange={setPromoEyebrow} />
              <TextField
                label="Heading"
                placeholder="e.g. Try Before Your Big Day"
                value={promoHeading}
                onChange={setPromoHeading}
              />
              <TextField
                label="Description"
                placeholder="e.g. Visit our studio and experience our collections in person."
                value={promoDescription}
                onChange={setPromoDescription}
                textarea
              />
              <TextField
                label="Decorative Quote (optional)"
                placeholder="e.g. Make it Memorable"
                value={promoQuote}
                onChange={setPromoQuote}
              />
              <p className="text-[11px] text-neutral-500">Uses the Trial CTA Button Label set in the Hero tab.</p>
            </>
          )}

          {activeTab === "Gallery" && (
            <>
              <p className="text-[11px] text-neutral-500">
                A photo strip pulled from your catalog item photos — no fabricated testimonials. Hidden until you set a heading.
              </p>
              <TextField
                label="Gallery Heading"
                placeholder="e.g. Real Brides, Real Moments"
                value={galleryHeading}
                onChange={setGalleryHeading}
              />
              <TextField
                label="Gallery Subheading"
                placeholder="e.g. A closer look at our pieces, styled for the big day"
                value={gallerySubheading}
                onChange={setGallerySubheading}
              />
              <TextField
                label="Instagram URL (optional)"
                placeholder="e.g. https://instagram.com/yourhandle"
                value={instagramUrl}
                onChange={setInstagramUrl}
              />
            </>
          )}

          {activeTab === "Trust Badges" && (
            <>
              <p className="text-[11px] text-neutral-500">
                Up to 4 short trust highlights shown as a card strip (e.g. delivery, support, guarantees). Hidden if empty.
              </p>
              {trustBadges.map((badge, idx) => (
                <div key={idx} className="rounded-xl border border-neutral-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-700">Badge {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeTrustBadge(idx)}
                      className="text-[11px] font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Title, e.g. Flexible Rental Dates"
                    value={badge.title}
                    onChange={(e) => updateTrustBadge(idx, "title", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                  />
                  <input
                    type="text"
                    placeholder="Subtitle, e.g. Choose what works for you"
                    value={badge.subtitle}
                    onChange={(e) => updateTrustBadge(idx, "subtitle", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                  />
                </div>
              ))}
              {trustBadges.length < 4 && (
                <button
                  type="button"
                  onClick={addTrustBadge}
                  className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  + Add trust badge
                </button>
              )}
            </>
          )}

          {activeTab === "Footer" && (
            <>
              <TextField
                label="About Text"
                placeholder="A short line about your business shown in the footer."
                value={footerAboutText}
                onChange={setFooterAboutText}
                textarea
              />
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  label="Column 1 Heading"
                  placeholder="e.g. Quick Links"
                  value={footerQuickLinksHeading}
                  onChange={setFooterQuickLinksHeading}
                />
                <TextField
                  label="Column 2 Heading"
                  placeholder="e.g. Customer Support"
                  value={footerSupportHeading}
                  onChange={setFooterSupportHeading}
                />
                <TextField
                  label="Column 3 Heading"
                  placeholder="e.g. Follow Us"
                  value={footerSocialHeading}
                  onChange={setFooterSocialHeading}
                />
              </div>

              <p className="text-[11px] text-neutral-500 pt-1">
                Links are split across columns 1 and 2 in order. Column 3 always shows Instagram (set in the Gallery tab) and WhatsApp.
              </p>
              {footerLinks.map((link, idx) => (
                <div key={idx} className="rounded-xl border border-neutral-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-700">Link {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFooterLink(idx)}
                      className="text-[11px] font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Label, e.g. Rental Guide"
                    value={link.label}
                    onChange={(e) => updateFooterLink(idx, "label", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                  />
                  <input
                    type="text"
                    placeholder="URL, e.g. https://wa.me/919876543210"
                    value={link.url}
                    onChange={(e) => updateFooterLink(idx, "url", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                  />
                </div>
              ))}
              {footerLinks.length < 12 && (
                <button
                  type="button"
                  onClick={addFooterLink}
                  className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  + Add footer link
                </button>
              )}
            </>
          )}
        </div>

        {settingsError && (
          <div className="mx-6 sm:mx-7 rounded-lg bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-800">
            {settingsError}
          </div>
        )}

        <div className="px-6 sm:px-7 py-4 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600">
            {savedSettingsNotice ? "✓ Saved successfully! Refreshing storefront." : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingSettings || uploadingBanner}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm disabled:opacity-60"
            >
              {savingSettings ? "Saving…" : "Save Storefront Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
