"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { submitWeddingWebsiteRsvp } from "@/lib/api/wedding-website-client";
import type { RsvpAttending } from "@/lib/api/wedding-website.types";
import { formatApiError } from "@/lib/utils/error";

export function RsvpForm({ slug }: { slug: string }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [attending, setAttending] = useState<RsvpAttending>("YES");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p className="text-center text-sm font-semibold text-emerald-70">Thank you — your RSVP has been received! 🎉</p>;
  }

  const nameError = name.trim().length === 0 ? "Please enter your name" : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (nameError) return;

    setSubmitting(true);
    const result = await submitWeddingWebsiteRsvp(slug, {
      name: name.trim(),
      attending,
      guestCount: guestCount ? Number(guestCount) : undefined,
      message: message.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3" noValidate>
      <div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          invalid={touched && !!nameError}
          placeholder="Your name"
          maxLength={150}
        />
        {touched && <FieldError message={nameError} />}
      </div>
      <div className="flex gap-2">
        {(["YES", "NO", "MAYBE"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setAttending(option)}
            className={`flex-1 rounded-md border px-3 py-2 text-xs font-bold ${
              attending === option ? "border-brand-primary bg-brand-primary-soft text-brand-primary" : "border-border text-text-grey"
            }`}
          >
            {option === "YES" ? "Joyfully Accept" : option === "NO" ? "Regretfully Decline" : "Maybe"}
          </button>
        ))}
      </div>
      {attending === "YES" && (
        <Input
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
          type="number"
          min={0}
          max={50}
          placeholder="Number of guests"
        />
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="A message for the couple (optional)"
        rows={2}
        maxLength={1000}
        className="rounded-md border border-border px-3 py-2.5 text-sm"
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send RSVP"}
      </Button>
    </form>
  );
}
