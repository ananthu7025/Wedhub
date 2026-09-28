"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { CheckIcon } from "@/components/portfolio/icons";
import { emailSchema, validateField } from "@/lib/validation/auth-schemas";

export function FooterNewsletterForm() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const emailError = useMemo(() => validateField(emailSchema, email), [email]);

  if (subscribed) {
    return (
      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">
        <CheckIcon className="inline h-3 w-3" /> Thank you for subscribing to itsmyKalyanam updates!
      </div>
    );
  }

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setDuplicateError(null);

    if (emailError) return;

    const normalized = email.trim().toLowerCase();
    try {
      const stored = localStorage.getItem("wedhub_newsletter_subscribers");
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (list.includes(normalized)) {
        setDuplicateError("This email address is already subscribed to our newsletter.");
        return;
      }
      list.push(normalized);
      localStorage.setItem("wedhub_newsletter_subscribers", JSON.stringify(list));
    } catch {
      // localStorage may fail in private mode, ignore storage error
    }

    setSubscribed(true);
  }

  return (
    <form onSubmit={handleSubscribe} noValidate>
      <div className="flex gap-2">
        <Input
          name="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (duplicateError) setDuplicateError(null);
          }}
          onBlur={() => setTouched(true)}
          invalid={(touched && !!emailError) || !!duplicateError}
          placeholder="Enter your email address"
          className="flex-1 border-neutral-grey px-3 py-2 text-xs"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary-hover shadow-sm"
        >
          Subscribe
        </button>
      </div>
      {touched && <FieldError message={emailError || duplicateError} />}
    </form>
  );
}
