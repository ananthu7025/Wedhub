"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { submitWeddingWebsiteRsvp } from "@/lib/api/wedding-website-client";
import type { RsvpAttending } from "@/lib/api/wedding-website.types";
import { formatApiError } from "@/lib/utils/error";

export function RsvpForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [attending, setAttending] = useState<RsvpAttending>("YES");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p className="text-center text-sm font-semibold text-emerald-70">Thank you — your RSVP has been received! 🎉</p>;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitWeddingWebsiteRsvp(slug, {
      name: name.trim(),
      attending,
      guestCount: guestCount ? Number(guestCount) : undefined,
      message: message.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3">
      {error && <p className="text-center text-xs text-red-70">{error}</p>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={150}
        className="rounded-md border border-border px-3 py-2.5 text-sm"
      />
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
        <input
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
          type="number"
          min={0}
          max={50}
          placeholder="Number of guests"
          className="rounded-md border border-border px-3 py-2.5 text-sm"
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
