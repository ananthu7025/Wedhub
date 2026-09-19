"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSingleVendorEnquiry } from "@/lib/api/shortlists-client";
import { trackEvent } from "@/lib/analytics/track";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { emailSchema, optionalPhoneSchema, validateField } from "@/lib/validation/auth-schemas";
import type { WeddingProfileWithDetails as ProfileSetupResponse } from "@/lib/api/profile-setup.types";

interface MeResponse {
  email: string;
  phone: string | null;
  profile: { firstName: string | null; lastName: string | null } | null;
}

/**
 * Enquiry modal — POST /enquiries/single-vendor (see
 * frontenddocs/04-stage-couple-experience.md Frontend Arch Phase 3). Only
 * reachable for logged-in users (the vendor profile CTA gates on
 * isAuthenticated and sends anonymous visitors to /login first, since the
 * backend endpoint technically allows anonymous submission but there is no
 * sensible in-progress-intent-preservation across a redirect worth building
 * for this phase — see progress log for the pragmatic call).
 */
export function EnquiryModal({
  vendorId,
  vendorName,
  open,
  onClose,
}: {
  vendorId: string;
  vendorName: string;
  open: boolean;
  onClose: () => void;
}) {
  // Mounting/unmounting on `open` (rather than an early return) gives the
  // inner form a fresh key each time it opens, so state naturally resets
  // without needing to setState synchronously inside an effect.
  if (!open) return null;
  return <EnquiryModalContent key="open" vendorId={vendorId} vendorName={vendorName} onClose={onClose} />;
}

function EnquiryModalContent({
  vendorId,
  vendorName,
  onClose,
}: {
  vendorId: string;
  vendorName: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [budget, setBudget] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error" | "already-enquired">("idle");
  const [existingConversationId, setExistingConversationId] = useState<string | null>(null);
  const [touched, setTouched] = useState<{
    contactName?: boolean;
    contactEmail?: boolean;
    contactPhone?: boolean;
    weddingDate?: boolean;
    budget?: boolean;
    guestCount?: boolean;
    message?: boolean;
  }>({});

  const nameError = contactName.trim().length === 0 ? "Please enter your name." : null;
  const emailError = useMemo(() => validateField(emailSchema, contactEmail), [contactEmail]);
  const phoneError = useMemo(() => validateField(optionalPhoneSchema, contactPhone), [contactPhone]);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  // Item 8: wedding date had no past-date restriction at all. Optional field
  // (brief's required list is Name/Email/Wedding date/Message — this only
  // rejects a date that WAS entered but is in the past; leaving it blank is
  // still fine).
  const weddingDateError =
    weddingDate.length > 0 && weddingDate < todayStr ? "Wedding date can't be in the past." : null;
  // Item 8: guest count/budget both allowed zero via the HTML min attribute
  // alone, which doesn't actually block submission. Neither is in the
  // brief's required-fields list, so blank stays valid — only an entered
  // value must be >= 1 / a positive amount.
  const guestCountError =
    guestCount.trim().length > 0 && Number(guestCount) < 1 ? "Guest count must be at least 1 if provided." : null;
  const budgetError =
    budget.trim().length > 0 && Number(budget) <= 0 ? "Enter a valid positive budget amount." : null;
  // Item 8: the brief's required-fields list has "Message or service
  // requirement" as one combined item. This form collects no other
  // service-requirement signal (no service/category picker, no
  // requirements checklist) — wedding date/budget/guest count are separate
  // named fields already listed on their own in the brief, not stand-ins
  // for "service requirement." With no other signal in this form, message
  // itself is the only field that can satisfy that requirement, so it
  // becomes required instead of "(optional)".
  const messageError = message.trim().length === 0 ? "Please tell the vendor what you need." : null;

  useEffect(() => {
    fetch("/api/users/me", { credentials: "include" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: MeResponse }) => {
        if (!json.success || !json.data) return;
        const { profile, email, phone } = json.data;
        const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
        setContactName((prev) => prev || fullName);
        setContactEmail((prev) => prev || email);
        setContactPhone((prev) => prev || phone || "");
      })
      .catch(() => {
        // Prefill is a convenience, not a requirement — leave fields blank on failure.
      });

    // Item 18: wedding date/budget/guest count were previously left blank
    // even though GET /users/me/profile-setup already has them from the
    // couple's own profile-setup wizard. Wedding date and budget don't live
    // as single scalars on WeddingProfile (date is per-event, budget is
    // per-category) — earliest upcoming event date and the first category
    // preference's budget are reasonable single-value stand-ins for a
    // pre-fill, not a hard source of truth.
    fetch("/api/users/me/profile-setup", { credentials: "include" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: { weddingProfile: ProfileSetupResponse | null } }) => {
        const weddingProfile = json.success ? json.data?.weddingProfile : null;
        if (!weddingProfile) return;
        if (weddingProfile.guestCount != null) {
          setGuestCount((prev) => prev || String(weddingProfile.guestCount));
        }
        const earliestDate = weddingProfile.eventDates
          .map((ed) => ed.date)
          .sort()[0];
        if (earliestDate) {
          setWeddingDate((prev) => prev || earliestDate.slice(0, 10));
        }
        const firstBudget = weddingProfile.categoryPreferences.find((cp) => cp.budgetMin || cp.budgetMax);
        if (firstBudget) {
          setBudget((prev) => prev || firstBudget.budgetMax || firstBudget.budgetMin || "");
        }
      })
      .catch(() => {
        // Prefill is a convenience, not a requirement — leave fields blank on failure.
      });
  }, []);

  useEffect(() => {
    // Arch Phase 18 Stage A — "Enquiry started" (product.md §46). Fired once
    // when the form actually opens (this component only mounts while
    // `open` is true — see EnquiryModal above), not on every keystroke.
    // There's no natural server-side hook for this: nothing is submitted to
    // the backend until the real POST /enquiries/single-vendor below, which
    // already fires enquiry_completed server-side (enquiry.service.ts) —
    // this client event is what makes the "started" half of that funnel
    // step observable at all.
    trackEvent({ eventType: "enquiry_started", vendorId, metadata: { vendorName } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      weddingDate: true,
      budget: true,
      guestCount: true,
      message: true,
    });
    const trimmedName = contactName.trim();
    if (nameError || emailError || phoneError || weddingDateError || guestCountError || budgetError || messageError) {
      return;
    }

    const trimmedPhone = contactPhone.trim();

    setStatus("submitting");

    const result = await createSingleVendorEnquiry({
      vendorId,
      contactName: trimmedName,
      contactEmail,
      contactPhone: trimmedPhone || undefined,
      weddingDate: weddingDate || undefined,
      budget: budget ? Number(budget) : undefined,
      guestCount: guestCount ? Number(guestCount) : undefined,
      message: message.trim(),
    });

    if (result.success) {
      setStatus("success");
    } else if (result.error?.code === "CONFLICT" && typeof result.error.details?.conversationId === "string") {
      // Item 20: this pair already has an open conversation — surface it as
      // "already enquired, here's the thread" rather than a raw error.
      setExistingConversationId(result.error.details.conversationId);
      setStatus("already-enquired");
    } else {
      // "error" status here just reverts the modal back to the form view
      // (see the render below) — the actual message now goes to a toast
      // instead of an inline banner.
      setStatus("error");
      showToast(formatApiError(result.error), "error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-2xl bg-white p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="float-right border-none bg-transparent text-lg text-text-grey"
          aria-label="Close"
        >
          ✕
        </button>

        {status === "success" ? (
          <div className="py-6 text-center">
            <h2 className="mb-2 text-lg font-bold">Enquiry sent!</h2>
            <p className="mb-6 text-sm text-text-grey">
              {vendorName} has been notified. Check your Inbox for their reply — we&apos;ll notify you there.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md bg-brand-primary py-3 text-sm font-bold text-white"
            >
              Done
            </button>
            <Link
              href="/enquiries"
              onClick={onClose}
              className="mt-3 block text-center text-[13px] font-semibold text-brand-primary hover:underline"
            >
              View My Enquiries
            </Link>
          </div>
        ) : status === "already-enquired" ? (
          <div className="py-6 text-center">
            <h2 className="mb-2 text-lg font-bold">You&apos;ve already enquired</h2>
            <p className="mb-6 text-sm text-text-grey">
              You&apos;ve already reached out to {vendorName}. Wait for them to reply, or follow up in your existing conversation.
            </p>
            <Link
              href={existingConversationId ? `/inbox?conversation=${existingConversationId}` : "/inbox"}
              onClick={onClose}
              className="block w-full rounded-md bg-brand-primary py-3 text-sm font-bold text-white no-underline"
            >
              Go to conversation
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 className="mb-1.5 text-lg font-bold">Send an enquiry</h2>
            <p className="mb-5.5 text-[13px] text-text-grey">To {vendorName}.</p>

            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-semibold">Your name</span>
              <Input
                maxLength={200}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, contactName: true }))}
                invalid={touched.contactName && !!nameError}
                className="px-3 py-2.5"
              />
              {touched.contactName && <FieldError message={nameError} />}
            </label>

            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-semibold">Your email</span>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, contactEmail: true }))}
                invalid={touched.contactEmail && !!emailError}
                className="px-3 py-2.5"
              />
              {touched.contactEmail && <FieldError message={emailError} />}
            </label>

            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-semibold">Contact number</span>
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                maxLength={20}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, contactPhone: true }))}
                invalid={touched.contactPhone && !!phoneError}
                className="px-3 py-2.5"
              />
              {touched.contactPhone && <FieldError message={phoneError} />}
            </label>

            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-semibold">
                Wedding date <span className="font-normal text-text-grey">(optional)</span>
              </span>
              <input
                type="date"
                min={todayStr}
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, weddingDate: true }))}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {touched.weddingDate && <FieldError message={weddingDateError} />}
            </label>

            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-semibold">
                Estimated budget (₹) <span className="font-normal text-text-grey">(optional)</span>
              </span>
              <input
                type="number"
                min="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, budget: true }))}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {touched.budget && <FieldError message={budgetError} />}
            </label>

            <label className="mb-3.5 block text-sm">
              <span className="mb-1.5 block font-semibold">
                Guest count <span className="font-normal text-text-grey">(optional)</span>
              </span>
              <input
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, guestCount: true }))}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {touched.guestCount && <FieldError message={guestCountError} />}
            </label>

            <label className="mb-4.5 block text-sm">
              <span className="mb-1.5 block font-semibold">Message</span>
              <textarea
                rows={3}
                placeholder="Tell them a bit about what you're looking for..."
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {touched.message && <FieldError message={messageError} />}
            </label>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-md bg-brand-primary py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Submit Enquiry"}
            </button>
            <p className="mt-3 text-center text-[11px] text-text-grey">
              Your name, email, phone, and message will be shared with {vendorName} so they can respond.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
