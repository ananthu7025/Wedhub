"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { FieldError } from "@/components/ui/FieldError";
import { emailSchema, validateField } from "@/lib/validation/auth-schemas";

export function FooterNewsletterForm() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const emailError = useMemo(() => validateField(emailSchema, email), [email]);

  if (subscribed) {
    return (
      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">
        ✓ Thank you for subscribing to itsmyKalyanam updates!
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!emailError) setSubscribed(true);
      }}
      noValidate
    >
      <div className="flex gap-2">
        <Input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          invalid={touched && !!emailError}
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
      {touched && <FieldError message={emailError} />}
    </form>
  );
}
