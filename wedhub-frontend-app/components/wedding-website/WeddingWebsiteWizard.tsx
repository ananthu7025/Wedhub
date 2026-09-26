"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/Toast";
import {
  createWeddingWebsite,
  createWeddingWebsiteEvent,
  deleteWeddingWebsiteEvent,
  generateWeddingWebsitePreview,
  createWeddingWebsitePublishOrder,
  getWeddingWebsiteDraft,
  updateWeddingWebsite,
} from "@/lib/api/wedding-website-client";
import type {
  WeddingWebsiteDraft,
  WeddingWebsiteEvent,
  WeddingWebsiteTemplate,
  WeddingWebsiteTemplateOption,
} from "@/lib/api/wedding-website.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";
import { CelebrationIcon, HeartIcon, SparkleIcon } from "@/components/portfolio/icons";
import { PhotoUploader } from "./PhotoUploader";
import { GalleryUploader } from "./GalleryUploader";
import { PublishCheckoutButton } from "./PublishCheckoutButton";
import { WizardProgress, type WizardStepName } from "./WizardProgress";

function normalizeUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Plain-check validator for the optional Google Maps link: empty is fine
// (field is optional), but anything entered must be a shape normalizeUrl()
// can turn into a real http(s) URL — mirrors the backend's z.string().url()
// constraint on googleMapsUrl (wedding-website.schema.ts) closely enough to
// catch obvious typos before they round-trip to the server.
function validateGoogleMapsUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    new URL(normalizeUrl(trimmed)!);
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

const TEMPLATE_BLURB: Record<WeddingWebsiteTemplate, string> = {
  ROYAL_WEDDING: "Opulent gold accents and dark, dramatic imagery.",
  MINIMAL_ELEGANT: "Clean, modern, and understated — lets your photos speak.",
  TRADITIONAL_INDIAN: "Rich crimson and green tones for a festive feel.",
};

function stepForDraft(draft: WeddingWebsiteDraft, requestedStep?: WizardStepName): WizardStepName {
  if (draft.status === "PUBLISHED") return "Published";
  if (requestedStep) return requestedStep;
  return "Details";
}

/**
 * The full ₹49 Instant Wedding Website creation flow — Template → Details
 * → Events → Photos → Story → Preview → Payment → Published. The draft is
 * persisted server-side after every step (PATCH /me/:id, or the relevant
 * sub-resource endpoint) rather than only held in local state, so a
 * refresh/close/abandon never loses entered information (feature spec's
 * Draft System requirement). "Story" is an 8th step not in the feature
 * spec's own summary progress list (which shows 7), added as its own
 * step rather than folded into Details/Photos since the spec's detailed
 * walkthrough treats it as a distinct section — confirmed with the user
 * 2026-09-03. Only END_USER-role couples get this from the web app, not
 * vendors — see the couple dashboard page for that decision.
 */
export function WeddingWebsiteWizard({
  initialDraft,
  templates,
  dashboardHref,
}: {
  initialDraft: WeddingWebsiteDraft | null;
  templates: WeddingWebsiteTemplateOption[];
  dashboardHref: string;
}) {
  const [draft, setDraft] = useState<WeddingWebsiteDraft | null>(initialDraft);
  const [step, setStep] = useState<WizardStepName>(initialDraft ? stepForDraft(initialDraft) : "Template");

  if (!draft) {
    return (
      <TemplateStep
        templates={templates}
        onCreated={(created) => {
          setDraft(created);
          setStep("Details");
        }}
      />
    );
  }

  return (
    <div>
      <WizardProgress current={step} />

      {step === "Template" && (
        <TemplateStep
          templates={templates}
          initialTemplate={draft.template}
          onCreated={(updated) => {
            setDraft(updated);
            setStep("Details");
          }}
          existingDraftId={draft.id}
        />
      )}
      {step === "Details" && <DetailsStep draft={draft} onSaved={(d) => setDraft(d)} onNext={() => setStep("Events")} />}
      {step === "Events" && <EventsStep draft={draft} onNext={() => setStep("Photos")} />}
      {step === "Photos" && <PhotosStep draft={draft} onSaved={(d) => setDraft(d)} onNext={() => setStep("Story")} />}
      {step === "Story" && <StoryStep draft={draft} onSaved={(d) => setDraft(d)} onNext={() => setStep("Preview")} />}
      {step === "Preview" && <PreviewStep draft={draft} onSaved={(d) => setDraft(d)} onNext={() => setStep("Payment")} />}
      {step === "Payment" && (
        <PaymentStep draft={draft} dashboardHref={dashboardHref} onPublished={(d) => setDraft(d)} />
      )}
      {step === "Published" && <PublishedStep draft={draft} dashboardHref={dashboardHref} />}
    </div>
  );
}

// ---- Step 1: Template ----

function TemplateStep({
  templates,
  initialTemplate,
  existingDraftId,
  onCreated,
}: {
  templates: WeddingWebsiteTemplateOption[];
  initialTemplate?: WeddingWebsiteTemplate;
  existingDraftId?: string;
  onCreated: (draft: WeddingWebsiteDraft) => void;
}) {
  const { showToast } = useToast();
  const [template, setTemplate] = useState<WeddingWebsiteTemplate>(initialTemplate ?? templates[0]?.id ?? "ROYAL_WEDDING");
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [touched, setTouched] = useState<{ brideName?: boolean; groomName?: boolean }>({});
  const [pending, setPending] = useState(false);

  // Bride/groom names are only collected (and required) when first creating
  // the draft — an existing draft already has both, so this step only lets
  // the couple change the template and there's nothing here to validate.
  const brideNameError = !existingDraftId && !brideName.trim() ? "Bride's name is required" : null;
  const groomNameError = !existingDraftId && !groomName.trim() ? "Groom's name is required" : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Changing the template on an already-created draft never deletes
    // wedding information — it's just a PATCH to the same row.
    if (existingDraftId) {
      setPending(true);
      const result = await updateWeddingWebsite(existingDraftId, { template });
      setPending(false);
      if (!result.success) {
        showToast(formatApiError(result.error), "error");
        return;
      }
      onCreated(result.data);
      return;
    }

    setTouched({ brideName: true, groomName: true });
    if (brideNameError || groomNameError) return;

    setPending(true);
    const result = await createWeddingWebsite({ template, brideName: brideName.trim(), groomName: groomName.trim() });
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    onCreated(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl" noValidate>
      <h1 className="mb-1.5 text-xl font-bold">
        <HeartIcon filled className="inline h-5 w-5" /> Create Your Wedding Website
      </h1>
      <p className="mb-6 text-[13px] text-text-grey">Choose a beautiful template to get started.</p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {templates.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTemplate(option.id)}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              template === option.id ? "border-brand-primary bg-brand-primary-soft" : "border-border bg-white hover:border-text-grey"
            }`}
          >
            <h3 className="mb-1 text-sm font-bold text-text-dark">{option.name}</h3>
            <p className="text-xs text-text-grey">{TEMPLATE_BLURB[option.id]}</p>
          </button>
        ))}
      </div>

      {!existingDraftId && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[13px] font-bold">Bride&apos;s name</span>
            <Input
              value={brideName}
              onChange={(e) => setBrideName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, brideName: true }))}
              invalid={touched.brideName && !!brideNameError}
              placeholder="e.g. Priya"
              maxLength={150}
            />
            {touched.brideName && <FieldError message={brideNameError} />}
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-bold">Groom&apos;s name</span>
            <Input
              value={groomName}
              onChange={(e) => setGroomName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, groomName: true }))}
              invalid={touched.groomName && !!groomNameError}
              placeholder="e.g. Rahul"
              maxLength={150}
            />
            {touched.groomName && <FieldError message={groomNameError} />}
          </div>
        </div>
      )}

      <Button type="submit" block disabled={pending}>
        {pending ? "Saving…" : existingDraftId ? "Save template" : "Continue"}
      </Button>
    </form>
  );
}

// ---- Step 2: Details ----

function DetailsStep({
  draft,
  onSaved,
  onNext,
}: {
  draft: WeddingWebsiteDraft;
  onSaved: (d: WeddingWebsiteDraft) => void;
  onNext: () => void;
}) {
  const { showToast } = useToast();
  const [fields, setFields] = useState({
    weddingDate: draft.weddingDate?.slice(0, 10) ?? "",
    weddingTime: draft.weddingTime ?? "",
    venueName: draft.venueName ?? "",
    venueAddress: draft.venueAddress ?? "",
    googleMapsUrl: draft.googleMapsUrl ?? "",
    shortDescription: draft.shortDescription ?? "",
    brideParents: draft.brideParents ?? "",
    groomParents: draft.groomParents ?? "",
    weddingHashtag: draft.weddingHashtag ?? "",
    contactInfo: draft.contactInfo ?? "",
  });
  const [touched, setTouched] = useState<{ googleMapsUrl?: boolean }>({});
  const [pending, setPending] = useState(false);

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const googleMapsUrlError = useMemo(() => validateGoogleMapsUrl(fields.googleMapsUrl), [fields.googleMapsUrl]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Every other field on this step is genuinely optional/freeform
    // server-side (see updateWeddingWebsiteSchema) — only the Google Maps
    // link has a real format constraint, so it's the only one that can
    // block advancing to the next step.
    setTouched({ googleMapsUrl: true });
    if (googleMapsUrlError) return;

    setPending(true);
    const result = await updateWeddingWebsite(draft.id, {
      weddingDate: fields.weddingDate ? new Date(fields.weddingDate).toISOString() : undefined,
      weddingTime: fields.weddingTime || undefined,
      venueName: fields.venueName || undefined,
      venueAddress: fields.venueAddress || undefined,
      googleMapsUrl: normalizeUrl(fields.googleMapsUrl),
      shortDescription: fields.shortDescription || undefined,
      brideParents: fields.brideParents || undefined,
      groomParents: fields.groomParents || undefined,
      weddingHashtag: fields.weddingHashtag || undefined,
      contactInfo: fields.contactInfo || undefined,
    });
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    onSaved(result.data);
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl" noValidate>
      <h2 className="mb-5 text-lg font-bold">Wedding Details</h2>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Wedding date">
          <input type="date" value={fields.weddingDate} onChange={(e) => set("weddingDate", e.target.value)} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Wedding time">
          <input value={fields.weddingTime} onChange={(e) => set("weddingTime", e.target.value)} placeholder="e.g. 6:00 PM" maxLength={50} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Venue name">
          <input value={fields.venueName} onChange={(e) => set("venueName", e.target.value)} placeholder="e.g. Taj Palace" maxLength={200} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Venue address">
          <input value={fields.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} placeholder="e.g. Delhi, India" maxLength={500} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
      </div>
      <div className="mb-4">
        <Field label="Google Maps link (optional)">
          <Input
            value={fields.googleMapsUrl}
            onChange={(e) => set("googleMapsUrl", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, googleMapsUrl: true }))}
            invalid={touched.googleMapsUrl && !!googleMapsUrlError}
            placeholder="https://maps.google.com/..."
            maxLength={1000}
          />
          {touched.googleMapsUrl && <FieldError message={googleMapsUrlError} />}
        </Field>
      </div>
      <div className="mb-4">
        <Field label="Short description">
          <textarea value={fields.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} rows={2} maxLength={500} placeholder="Join us as we celebrate..." className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Bride's parents (optional)">
          <textarea
            value={fields.brideParents}
            onChange={(e) => set("brideParents", e.target.value)}
            rows={3}
            maxLength={200}
            placeholder={"Mr T.R John & Mrs Santha John\nThayyalakkal House"}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </Field>
        <Field label="Groom's parents (optional)">
          <textarea
            value={fields.groomParents}
            onChange={(e) => set("groomParents", e.target.value)}
            rows={3}
            maxLength={200}
            placeholder={"Mr Jose Syriac & Mrs Shyla Jose\nKanakkancherry House"}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </Field>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Wedding hashtag (optional)">
          <input value={fields.weddingHashtag} onChange={(e) => set("weddingHashtag", e.target.value)} placeholder="e.g. PriyaWedsRahul" maxLength={100} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
        <Field label="Contact info (optional)">
          <input value={fields.contactInfo} onChange={(e) => set("contactInfo", e.target.value)} placeholder="Phone or email for guests" maxLength={300} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
      </div>
      <Button type="submit" block disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold">{label}</span>
      {children}
    </label>
  );
}

// ---- Step 3: Events ----

function EventsStep({ draft, onNext }: { draft: WeddingWebsiteDraft; onNext: () => void }) {
  const { showToast } = useToast();
  const [events, setEvents] = useState<WeddingWebsiteEvent[]>(draft.events);
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [adding, setAdding] = useState(false);

  const nameError = name.trim() ? null : "Please name the event";

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setNameTouched(true);
    if (nameError) return;

    setAdding(true);
    const result = await createWeddingWebsiteEvent(draft.id, {
      name: name.trim(),
      venue: venue.trim() || undefined,
      description: description.trim() || undefined,
    });
    setAdding(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    setEvents((prev) => [...prev, result.data]);
    setName("");
    setVenue("");
    setDescription("");
    setNameTouched(false);
  }

  async function handleDelete(eventId: string) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    await deleteWeddingWebsiteEvent(eventId);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1.5 text-lg font-bold">Wedding Events</h2>
      <p className="mb-5 text-[13px] text-text-grey">Add ceremonies like Mehendi, Haldi, or Reception.</p>

      <div className="mb-5 flex flex-col gap-2">
        {events.map((event) => (
          <div key={event.id} className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-bold text-text-dark">{event.name}</p>
              {event.venue && <p className="text-xs text-text-grey">{event.venue}</p>}
            </div>
            <button type="button" onClick={() => handleDelete(event.id)} className="text-xs font-bold text-red hover:underline">
              Remove
            </button>
          </div>
        ))}
        {events.length === 0 && <p className="text-sm text-text-grey">No events added yet.</p>}
      </div>

      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2.5 rounded-md border border-dashed border-border p-4" noValidate>
        <div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            invalid={nameTouched && !!nameError}
            placeholder="Event name (e.g. Mehendi)"
            maxLength={150}
            className="py-2"
          />
          {nameTouched && <FieldError message={nameError} />}
        </div>
        <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue (optional)" maxLength={200} className="rounded-md border border-border px-3 py-2 text-sm" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} maxLength={1000} className="rounded-md border border-border px-3 py-2 text-sm" />
        <Button type="submit" variant="secondary" size="sm" disabled={adding}>
          {adding ? "Adding…" : "+ Add Event"}
        </Button>
      </form>

      <Button type="button" block onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}

// ---- Step 4: Photos ----

function PhotosStep({
  draft,
  onSaved,
  onNext,
}: {
  draft: WeddingWebsiteDraft;
  onSaved: (d: WeddingWebsiteDraft) => void;
  onNext: () => void;
}) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleCoverUploaded(media: { id: string }) {
    const result = await updateWeddingWebsite(draft.id, { coverMediaId: media.id });
    if (result.success) {
      onSaved(result.data);
    } else {
      showToast(formatApiError(result.error), "error");
    }
  }

  async function handleCouplePhotoUploaded(media: { id: string }) {
    const result = await updateWeddingWebsite(draft.id, { couplePhotoMediaId: media.id });
    if (result.success) {
      onSaved(result.data);
    } else {
      showToast(formatApiError(result.error), "error");
    }
  }

  async function handleContinue() {
    setPending(true);
    const refreshed = await getWeddingWebsiteDraft(draft.id);
    setPending(false);
    if (refreshed.success) onSaved(refreshed.data);
    onNext();
  }

  const coverKey = draft.coverMedia?.optimizedObjectKey ?? draft.coverMedia?.originalObjectKey ?? null;
  const coupleKey = draft.couplePhotoMedia?.optimizedObjectKey ?? draft.couplePhotoMedia?.originalObjectKey ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1.5 text-lg font-bold">Photos</h2>
      <p className="mb-5 text-[13px] text-text-grey">Add your cover photo, a couple photo, and gallery images.</p>

      <div className="mb-6 flex flex-col gap-5">
        <PhotoUploader
          weddingWebsiteId={draft.id}
          currentPreviewUrl={coverKey ? getPublicMediaUrl(coverKey) : null}
          label="Cover photo"
          onUploaded={handleCoverUploaded}
        />
        <PhotoUploader
          weddingWebsiteId={draft.id}
          currentPreviewUrl={coupleKey ? getPublicMediaUrl(coupleKey) : null}
          label="Couple photo"
          onUploaded={handleCouplePhotoUploaded}
        />
        <GalleryUploader weddingWebsiteId={draft.id} initialGallery={draft.gallery} />
      </div>

      <Button type="button" block onClick={handleContinue} disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </div>
  );
}

// ---- Step 5: Story ----

function StoryStep({
  draft,
  onSaved,
  onNext,
}: {
  draft: WeddingWebsiteDraft;
  onSaved: (d: WeddingWebsiteDraft) => void;
  onNext: () => void;
}) {
  const { showToast } = useToast();
  const [fields, setFields] = useState({
    coupleStory: draft.coupleStory ?? "",
    brideDescription: draft.brideDescription ?? "",
    groomDescription: draft.groomDescription ?? "",
    howWeMet: draft.howWeMet ?? "",
  });
  const [pending, setPending] = useState(false);

  function set<K extends keyof typeof fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // Every field here is genuinely freeform and optional server-side (see
  // updateWeddingWebsiteSchema) — the only real constraint is the maxLength
  // already enforced on each textarea below, so there's no format/required
  // check to add.
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await updateWeddingWebsite(draft.id, {
      coupleStory: fields.coupleStory || undefined,
      brideDescription: fields.brideDescription || undefined,
      groomDescription: fields.groomDescription || undefined,
      howWeMet: fields.howWeMet || undefined,
    });
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    onSaved(result.data);
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl" noValidate>
      <h2 className="mb-1.5 text-lg font-bold">Your Story</h2>
      <p className="mb-5 text-[13px] text-text-grey">Keep it simple — a few lines is plenty.</p>

      <div className="mb-4">
        <Field label="Couple story (optional)">
          <textarea
            value={fields.coupleStory}
            onChange={(e) => set("coupleStory", e.target.value)}
            rows={3}
            maxLength={3000}
            placeholder="Tell your guests a little about your journey together..."
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </Field>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={`About ${draft.brideName} (optional)`}>
          <textarea value={fields.brideDescription} onChange={(e) => set("brideDescription", e.target.value)} rows={3} maxLength={1000} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
        <Field label={`About ${draft.groomName} (optional)`}>
          <textarea value={fields.groomDescription} onChange={(e) => set("groomDescription", e.target.value)} rows={3} maxLength={1000} className="w-full rounded-md border border-border px-3 py-2.5 text-sm" />
        </Field>
      </div>
      <div className="mb-6">
        <Field label="How we met (optional)">
          <textarea
            value={fields.howWeMet}
            onChange={(e) => set("howWeMet", e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="A short note on how it all started..."
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          />
        </Field>
      </div>
      <Button type="submit" block disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}

// ---- Step 6: Preview ----

function PreviewStep({
  draft,
  onSaved,
  onNext,
}: {
  draft: WeddingWebsiteDraft;
  onSaved: (d: WeddingWebsiteDraft) => void;
  onNext: () => void;
}) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const alreadyUsed = Boolean(draft.previewUsedAt);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  async function handleGeneratePreview() {
    setPending(true);
    const result = await generateWeddingWebsitePreview(draft.id);
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    setPreviewUrl(`${siteUrl}/preview/${result.data.previewToken}`);
    const refreshed = await getWeddingWebsiteDraft(draft.id);
    if (refreshed.success) onSaved(refreshed.data);
  }

  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="mb-1.5 text-lg font-bold">
        <SparkleIcon className="inline h-5 w-5" /> Preview your website
      </h2>
      <p className="mb-6 text-[13px] text-text-grey">
        You get one free public preview before publishing. Once used, editing your draft never regenerates a new one.
      </p>

      {previewUrl ? (
        <div className="mb-6 rounded-md border border-border bg-surface-input p-4">
          <p className="mb-2 text-sm font-bold text-text-dark">Your preview is ready ❤️</p>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-brand-primary hover:underline">
            {previewUrl}
          </a>
        </div>
      ) : alreadyUsed ? (
        <div className="mb-6 rounded-md bg-amber-10 p-4 text-sm text-amber-70">
          Your free preview has already been used ❤️ You can still edit your draft and publish whenever you&apos;re ready.
        </div>
      ) : (
        <Button type="button" onClick={handleGeneratePreview} disabled={pending} className="mb-6">
          {pending ? "Generating…" : "Preview Website"}
        </Button>
      )}

      <p className="mb-3 text-sm font-bold text-text-dark">Love it?</p>
      <Button type="button" block onClick={onNext}>
        Publish My Website – ₹49
      </Button>
    </div>
  );
}

// ---- Step 7: Payment ----

function PaymentStep({
  draft,
  dashboardHref,
  onPublished,
}: {
  draft: WeddingWebsiteDraft;
  dashboardHref: string;
  onPublished: (d: WeddingWebsiteDraft) => void;
}) {
  const { showToast } = useToast();
  const [order, setOrder] = useState<{ orderId: string; amount: number; currency: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [polling, setPolling] = useState(false);

  async function handleCreateOrder() {
    setPending(true);
    const result = await createWeddingWebsitePublishOrder(draft.id);
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    setOrder(result.data);
  }

  // Never trust the frontend checkout callback (Business Rule 9) — poll
  // the real draft status until the webhook has actually flipped it to
  // PUBLISHED.
  async function handlePaymentHandlerFired() {
    setPolling(true);
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const refreshed = await getWeddingWebsiteDraft(draft.id);
      if (refreshed.success && refreshed.data.status === "PUBLISHED") {
        setPolling(false);
        onPublished(refreshed.data);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setPolling(false);
    showToast("Payment is still being confirmed — refresh this page in a moment.", "info");
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <h2 className="mb-1.5 text-lg font-bold">Publish My Wedding Website – ₹49</h2>
      <p className="mb-6 text-[13px] text-text-grey">
        A beautiful, shareable wedding website for just ₹49 — one-time payment, unlimited edits after.
      </p>

      {polling ? (
        <p className="text-sm text-text-grey">Confirming your payment…</p>
      ) : order ? (
        <PublishCheckoutButtonLoader order={order} coupleNames={`${draft.brideName} & ${draft.groomName}`} onSuccess={handlePaymentHandlerFired} />
      ) : (
        <Button type="button" block onClick={handleCreateOrder} disabled={pending}>
          {pending ? "Preparing checkout…" : "Publish My Website – ₹49"}
        </Button>
      )}

      <p className="mt-6 text-xs text-text-grey">
        Payment is verified securely by our backend before your website goes live.{" "}
        <Link href={dashboardHref} className="font-bold text-brand-primary hover:underline">
          Return to dashboard
        </Link>
      </p>
    </div>
  );
}

function PublishCheckoutButtonLoader({
  order,
  coupleNames,
  onSuccess,
}: {
  order: { orderId: string; amount: number; currency: string };
  coupleNames: string;
  onSuccess: () => void;
}) {
  return <PublishCheckoutButton orderId={order.orderId} amount={order.amount} currency={order.currency} coupleNames={coupleNames} onSuccess={onSuccess} />;
}

// ---- Step 8: Published ----

function PublishedStep({ draft, dashboardHref }: { draft: WeddingWebsiteDraft; dashboardHref: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const publicUrl = draft.slug ? `${siteUrl}/wedding/${draft.slug}` : null;

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-10 text-emerald-70">
        <CelebrationIcon className="h-9 w-9" />
      </div>
      <h2 className="mb-2.5 text-2xl font-bold">Your wedding website is live ❤️</h2>
      {publicUrl && (
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mb-6 block text-sm font-bold text-brand-primary hover:underline">
          {publicUrl}
        </a>
      )}
      <div className="flex flex-col gap-2.5">
        {publicUrl && (
          <Button href={publicUrl} target="_blank">
            View Website
          </Button>
        )}
        <Button href={dashboardHref} variant="secondary">
          Manage Website
        </Button>
      </div>
    </div>
  );
}
