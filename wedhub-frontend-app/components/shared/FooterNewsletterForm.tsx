"use client";

import { useState } from "react";

export function FooterNewsletterForm() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

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
        if (email.trim()) setSubscribed(true);
      }}
      className="flex gap-2"
    >
      <input
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="flex-1 rounded-md border border-neutral-grey bg-white px-3 py-2 text-xs text-text-dark outline-none focus:border-brand-primary"
      />
      <button
        type="submit"
        className="rounded-md bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary-hover shadow-sm"
      >
        Subscribe
      </button>
    </form>
  );
}
